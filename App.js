require('dotenv').config(); 

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors'); 

const app = express();

// Middlewares
app.use(bodyParser.json()); 
app.use(cors()); 
app.use(express.static('public'));


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

db.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
    throw err;
  }
  console.log('Conectado ao MySQL!');
});


app.post('/projetos', (req, res) => {
  const { nome, descricao, tecnologias } = req.body; 

  
  db.beginTransaction(err => {
    if (err) {
      console.error('Erro ao iniciar transação:', err);
      return res.status(500).send(err);
    }

    
    const sqlProjeto = 'INSERT INTO projetos (nome, descricao) VALUES (?, ?)';
    db.query(sqlProjeto, [nome, descricao], (err, resultProjeto) => {
      if (err) {
        return db.rollback(() => {
          console.error('Erro ao inserir projeto:', err);
          res.status(500).send(err);
        });
      }

      const projectId = resultProjeto.insertId;

      
      if (tecnologias && tecnologias.length > 0) {
        const sqlAssociacao = 'INSERT INTO projetos_tecnologias (projeto_id, tecnologia_id) VALUES ?';
        const valoresAssociacao = tecnologias.map(techId => [projectId, techId]);

        db.query(sqlAssociacao, [valoresAssociacao], (err) => {
          if (err) {
            return db.rollback(() => { 
              console.error('Erro ao associar tecnologias:', err);
              res.status(500).send(err);
            });
          }
          
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


app.put('/projetos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, descricao, tecnologias } = req.body; 

  db.beginTransaction(err => {
    if (err) {
      console.error('Erro ao iniciar transação para UPDATE:', err);
      return res.status(500).send(err);
    }

  
    const sqlUpdateProjeto = 'UPDATE projetos SET nome = ?, descricao = ? WHERE id = ?';
    db.query(sqlUpdateProjeto, [nome, descricao, id], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error('Erro ao atualizar projeto (nome/descricao):', err);
          res.status(500).send(err);
        });
      }

      
      const sqlDeleteAssociacoes = 'DELETE FROM projetos_tecnologias WHERE projeto_id = ?';
      db.query(sqlDeleteAssociacoes, [id], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Erro ao excluir associações antigas de tecnologias:', err);
            res.status(500).send(err);
          });
        }

        if (tecnologias && tecnologias.length > 0) {
          const sqlInsertAssociacoes = 'INSERT INTO projetos_tecnologias (projeto_id, tecnologia_id) VALUES ?';
          const valoresNovasAssociacoes = tecnologias.map(techId => [id, techId]);

          db.query(sqlInsertAssociacoes, [valoresNovasAssociacoes], (err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Erro ao inserir novas associações de tecnologias:', err);
                res.status(500).send(err);
              });
            }
           
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  console.error('Erro ao fazer commit da transação de UPDATE:', err);
                  res.status(500).send(err);
                });
              }
              res.status(200).send({ mensagem: 'Projeto e tecnologias atualizados com sucesso' });
            });
          });
        } else {
         
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Erro ao fazer commit da transação de UPDATE (sem tecnologias):', err);
                res.status(500).send(err);
              });
            }
            res.status(200).send({ mensagem: 'Projeto atualizado com sucesso (sem alteração de tecnologias)' });
          });
        }
      });
    });
  });
});


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

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});