require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Conexão com MySQL usando variáveis de ambiente
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

db.connect(err => {
  if (err) throw err;
  console.log('Conectado ao MySQL!');
});

// CREATE (Criar novo projeto com tecnologias)
app.post('/projetos', (req, res) => {
  const { nome, descricao, tecnologias } = req.body; // 'tecnologias' é um array de IDs

  // Iniciar uma transação para garantir que ambas as inserções aconteçam ou nenhuma delas
  db.beginTransaction(err => {
    if (err) {
      console.error('Erro ao iniciar transação:', err);
      return res.status(500).send(err);
    }

    // 1. Inserir o novo projeto na tabela 'projetos'
    const sqlProjeto = 'INSERT INTO projetos (nome, descricao) VALUES (?, ?)';
    db.query(sqlProjeto, [nome, descricao], (err, resultProjeto) => {
      if (err) {
        return db.rollback(() => { // Em caso de erro, desfaz a transação
          console.error('Erro ao inserir projeto:', err);
          res.status(500).send(err);
        });
      }

      const projectId = resultProjeto.insertId;

      // 2. Inserir as associações na tabela 'projetos_tecnologias'
      if (tecnologias && tecnologias.length > 0) {
        // Prepara os valores para inserção em massa: [[projeto_id, tecnologia_id], ...]
        const sqlAssociacao = 'INSERT INTO projetos_tecnologias (projeto_id, tecnologia_id) VALUES ?';
        const valoresAssociacao = tecnologias.map(techId => [projectId, techId]);

        db.query(sqlAssociacao, [valoresAssociacao], (err) => {
          if (err) {
            return db.rollback(() => { // Em caso de erro, desfaz a transação
              console.error('Erro ao associar tecnologias:', err);
              res.status(500).send(err);
            });
          }
          // Se tudo deu certo, commit da transação
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Erro ao fazer commit da transação:', err);
                res.status(500).send(err);
              });
            }
            res.status(201).send({ id: projectId, nome, descricao, tecnologias });
          });
        });
      } else {
        // Se não houver tecnologias para associar, apenas faz commit do projeto
        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error('Erro ao fazer commit da transação (sem tecnologias):', err);
              res.status(500).send(err);
            });
          }
          res.status(201).send({ id: projectId, nome, descricao });
        });
      }
    });
  });
});

// READ (Listar todos os projetos com tecnologias)
app.get('/projetos', (req, res) => {
  const sql = `
    SELECT
      p.id,
      p.nome,
      p.descricao,
      GROUP_CONCAT(t.id) AS tecnologias_ids,
      GROUP_CONCAT(t.nome) AS tecnologias_nomes
    FROM
      projetos p
    LEFT JOIN
      projetos_tecnologias pt ON p.id = pt.projeto_id
    LEFT JOIN
      tecnologias t ON pt.tecnologia_id = t.id
    GROUP BY
      p.id, p.nome, p.descricao;
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao buscar projetos com tecnologias:', err);
      return res.status(500).send(err);
    }

  
    const projetosComTecnologias = results.map(row => {
      const tecnologias = [];
      if (row.tecnologias_ids && row.tecnologias_nomes) {
        const ids = row.tecnologias_ids.split(',');
        const nomes = row.tecnologias_nomes.split(',');
        for (let i = 0; i < ids.length; i++) {
          tecnologias.push({ id: parseInt(ids[i]), nome: nomes[i] });
        }
      }
      return {
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        tecnologias: tecnologias
      };
    });

    res.status(200).send(projetosComTecnologias);
  });
});

// READ (Buscar projeto por ID com tecnologias)
app.get('/projetos/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT
      p.id,
      p.nome,
      p.descricao,
      GROUP_CONCAT(t.id) AS tecnologias_ids,
      GROUP_CONCAT(t.nome) AS tecnologias_nomes
    FROM
      projetos p
    LEFT JOIN
      projetos_tecnologias pt ON p.id = pt.projeto_id
    LEFT JOIN
      tecnologias t ON pt.tecnologia_id = t.id
    WHERE
      p.id = ?
    GROUP BY
      p.id, p.nome, p.descricao;
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar projeto por ID com tecnologias:', err);
      return res.status(500).send(err);
    }

    if (results.length === 0) {
      return res.status(404).send({ mensagem: 'Projeto não encontrado' });
    }

    // Processar o resultado (primeira linha) para formatar as tecnologias
    const row = results[0];
    const tecnologias = [];
    if (row.tecnologias_ids && row.tecnologias_nomes) {
      const ids = row.tecnologias_ids.split(',');
      const nomes = row.tecnologias_nomes.split(',');
      for (let i = 0; i < ids.length; i++) {
        tecnologias.push({ id: parseInt(ids[i]), nome: nomes[i] });
      }
    }
    const projetoComTecnologias = {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      tecnologias: tecnologias
    };

    res.status(200).send(projetoComTecnologias);
  });
});

// UPDATE (Atualizar projeto)
app.put('/projetos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  const sql = 'UPDATE projetos SET nome = ?, descricao = ? WHERE id = ?';
  db.query(sql, [nome, descricao, id], (err) => {
    if (err) {
      console.error('Erro ao atualizar projeto:', err);
      return res.status(500).send(err);
    }
    res.status(200).send({ mensagem: 'Projeto atualizado com sucesso' });
  });
});

// DELETE (Excluir projeto)
app.delete('/projetos/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM projetos WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Erro ao excluir projeto:', err);
      return res.status(500).send(err);
    }
    res.status(200).send({ mensagem: 'Projeto excluído com sucesso' });
  });
});

// Iniciar servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});