// Define a URL base da sua API
const API_URL = 'http://localhost:3000'; // Sua API Node.js roda nesta porta

// Elementos do DOM que vamos manipular
const projectForm = document.getElementById('project-form'); // O formulário de adicionar/editar
const projetosListDiv = document.getElementById('projetos-list'); // A div onde os projetos serão listados
const messageArea = document.getElementById('message-area'); // Área para exibir mensagens de sucesso/erro

// Variável para armazenar o ID do projeto que está sendo editado (se houver)
let editingProjectId = null;

// Função para exibir mensagens para o usuário
function showMessage(message, type = 'success') {
    messageArea.textContent = message;
    messageArea.className = `message ${type}`; // Adiciona classes para estilização (success ou error)
    messageArea.style.display = 'block'; // Torna a mensagem visível
    setTimeout(() => {
        messageArea.style.display = 'none'; // Esconde a mensagem após alguns segundos
    }, 3000);
}

// Função assíncrona para buscar e exibir todos os projetos
async function fetchProjetos() {
    projetosListDiv.innerHTML = '<p>Carregando projetos...</p>'; // Mensagem de carregamento
    try {
        const response = await fetch(`${API_URL}/projetos`); // Faz a requisição GET para a API
        if (!response.ok) { // Verifica se a resposta HTTP foi bem-sucedida (status 2xx)
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const projetos = await response.json(); // Converte a resposta para um objeto JavaScript (JSON)

        projetosListDiv.innerHTML = ''; // Limpa a div antes de adicionar os projetos
        
        if (projetos.length === 0) {
            projetosListDiv.innerHTML = '<p>Nenhum projeto cadastrado ainda.</p>';
            return;
        }

        // Itera sobre cada projeto e cria um elemento HTML para ele
        projetos.forEach(projeto => {
            const projectItem = document.createElement('div');
            projectItem.className = 'projeto-item'; // Classe para estilização
            projectItem.innerHTML = `
                <h3>${projeto.nome} (ID: ${projeto.id})</h3>
                <p>${projeto.descricao}</p>
                <p><strong>Tecnologias:</strong> ${projeto.tecnologias.map(tech => tech.nome).join(', ')}</p>
                <div class="actions">
                    <button class="edit-btn" data-id="${projeto.id}">Editar</button>
                    <button class="delete-btn" data-id="${projeto.id}">Excluir</button>
                </div>
            `;
            projetosListDiv.appendChild(projectItem);
        });

    } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        projetosListDiv.innerHTML = `<p style="color: red;">Erro ao carregar projetos: ${error.message}. Verifique se o servidor Node.js está rodando e o CORS está configurado.</p>`;
        showMessage(`Erro ao carregar projetos: ${error.message}`, 'error');
    }
}

// =====================================
// LÓGICA DO FORMULÁRIO DE CRIAÇÃO/EDIÇÃO
// =====================================

// Listener para o evento de 'submit' do formulário
projectForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Previne o comportamento padrão de recarregar a página

    const nome = document.getElementById('nome').value;
    const descricao = document.getElementById('descricao').value;
    const tecnologiasInput = document.getElementById('tecnologias').value;

    // Converte a string de IDs de tecnologias para um array de números
    const tecnologias = tecnologiasInput
        .split(',')
        .map(techId => parseInt(techId.trim()))
        .filter(techId => !isNaN(techId) && techId > 0); // Filtra valores inválidos e IDs <= 0

    const projectData = {
        nome,
        descricao,
        tecnologias
    };

    try {
        let response;
        let method;
        let url;

        if (editingProjectId) { // Se estamos editando um projeto existente
            method = 'PUT';
            url = `${API_URL}/projetos/${editingProjectId}`;
        } else { // Se estamos criando um novo projeto
            method = 'POST';
            url = `${API_URL}/projetos`;
        }

        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.mensagem || 'Erro desconhecido'}`);
        }

        // Sucesso na operação (criação ou edição)
        const responseData = await response.json();
        const successMessage = editingProjectId ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!';
        showMessage(successMessage, 'success');

        projectForm.reset(); // Limpa o formulário
        editingProjectId = null; // Reseta o ID de edição
        document.querySelector('#project-form button[type="submit"]').textContent = 'Salvar Projeto'; // Muda o botão de volta para "Salvar Projeto"
        fetchProjetos(); // Recarrega a lista de projetos
    } catch (error) {
        console.error('Erro ao salvar projeto:', error);
        showMessage(`Erro ao salvar projeto: ${error.message}`, 'error');
    }
});


// =====================================
// LÓGICA DE EDIÇÃO E EXCLUSÃO (DELEGAÇÃO DE EVENTOS)
// =====================================

// Delegação de eventos para botões de Editar e Excluir
// Adiciona um único listener na div pai para capturar cliques nos botões filhos
projetosListDiv.addEventListener('click', async (event) => {
    // Botão de EXCLUIR
    if (event.target.classList.contains('delete-btn')) {
        const projectId = event.target.dataset.id; // Pega o ID do projeto do atributo data-id

        if (confirm(`Tem certeza que deseja excluir o projeto (ID: ${projectId})?`)) {
            try {
                const response = await fetch(`${API_URL}/projetos/${projectId}`, {
                    method: 'DELETE' // Método HTTP DELETE
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Erro HTTP: ${response.status} - ${errorData.mensagem || 'Erro desconhecido ao excluir projeto'}`);
                }

                showMessage('Projeto excluído com sucesso!', 'success');
                fetchProjetos(); // Recarrega a lista
            } catch (error) {
                console.error('Erro ao excluir projeto:', error);
                showMessage(`Erro ao excluir projeto: ${error.message}`, 'error');
            }
        }
    }

    // Botão de EDITAR
    if (event.target.classList.contains('edit-btn')) {
        const projectId = event.target.dataset.id; // Pega o ID do projeto do atributo data-id
        
        try {
            const response = await fetch(`${API_URL}/projetos/${projectId}`); // Busca os dados do projeto
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const projetoToEdit = await response.json();

            // Preenche o formulário com os dados do projeto
            document.getElementById('nome').value = projetoToEdit.nome;
            document.getElementById('descricao').value = projetoToEdit.descricao;
            
            // Preenche as tecnologias: mapeia para IDs e junta com vírgula
            document.getElementById('tecnologias').value = 
                projetoToEdit.tecnologias.map(tech => tech.id).join(',');

            // Armazena o ID do projeto que está sendo editado
            editingProjectId = projectId;
            // Muda o texto do botão de submissão para indicar edição
            document.querySelector('#project-form button[type="submit"]').textContent = 'Atualizar Projeto';

            showMessage('Modo de edição ativado. Altere os campos e clique em "Atualizar Projeto".', 'success');

        } catch (error) {
            console.error('Erro ao carregar projeto para edição:', error);
            showMessage(`Erro ao carregar projeto para edição: ${error.message}`, 'error');
        }
    }
});

// Adiciona um listener para quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    fetchProjetos(); // Chama a função para carregar os projetos ao iniciar a página
});