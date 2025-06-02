const API_URL = 'http://localhost:3000';
const projectForm = document.getElementById('project-form'); 
const projetosListDiv = document.getElementById('projetos-list'); 
const messageArea = document.getElementById('message-area'); 

let editingProjectId = null;


function showMessage(message, type = 'success') {
    messageArea.textContent = message;
    messageArea.className = `message ${type}`;
    messageArea.style.display = 'block'; 
    setTimeout(() => {
        messageArea.style.display = 'none'; 
    }, 3000);
}


async function fetchProjetos() {
    projetosListDiv.innerHTML = '<p>Carregando projetos...</p>';
    try {
        const response = await fetch(`${API_URL}/projetos`); 
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const projetos = await response.json();

        projetosListDiv.innerHTML = ''; 
        
        if (projetos.length === 0) {
            projetosListDiv.innerHTML = '<p>Nenhum projeto cadastrado ainda.</p>';
            return;
        }

        
        projetos.forEach(projeto => {
            const projectItem = document.createElement('div');
            projectItem.className = 'projeto-item'; 
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

projectForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const nome = document.getElementById('nome').value;
    const descricao = document.getElementById('descricao').value;
    const tecnologiasInput = document.getElementById('tecnologias').value;

   
    const tecnologias = tecnologiasInput
        .split(',')
        .map(techId => parseInt(techId.trim()))
        .filter(techId => !isNaN(techId) && techId > 0); 

    const projectData = {
        nome,
        descricao,
        tecnologias
    };

    try {
        let response;
        let method;
        let url;

        if (editingProjectId) { 
            method = 'PUT';
            url = `${API_URL}/projetos/${editingProjectId}`;
        } else { 
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

       
        const responseData = await response.json();
        const successMessage = editingProjectId ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!';
        showMessage(successMessage, 'success');

        projectForm.reset(); 
        editingProjectId = null; 
        document.querySelector('#project-form button[type="submit"]').textContent = 'Salvar Projeto'; 
        fetchProjetos();
    } catch (error) {
        console.error('Erro ao salvar projeto:', error);
        showMessage(`Erro ao salvar projeto: ${error.message}`, 'error');
    }
});


projetosListDiv.addEventListener('click', async (event) => {
    
    if (event.target.classList.contains('delete-btn')) {
        const projectId = event.target.dataset.id;

        if (confirm(`Tem certeza que deseja excluir o projeto (ID: ${projectId})?`)) {
            try {
                const response = await fetch(`${API_URL}/projetos/${projectId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Erro HTTP: ${response.status} - ${errorData.mensagem || 'Erro desconhecido ao excluir projeto'}`);
                }

                showMessage('Projeto excluído com sucesso!', 'success');
                fetchProjetos(); 
            } catch (error) {
                console.error('Erro ao excluir projeto:', error);
                showMessage(`Erro ao excluir projeto: ${error.message}`, 'error');
            }
        }
    }

   
    if (event.target.classList.contains('edit-btn')) {
        const projectId = event.target.dataset.id; 
        
        try {
            const response = await fetch(`${API_URL}/projetos/${projectId}`);
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const projetoToEdit = await response.json();

           
            document.getElementById('nome').value = projetoToEdit.nome;
            document.getElementById('descricao').value = projetoToEdit.descricao;
            
            
            document.getElementById('tecnologias').value = 
                projetoToEdit.tecnologias.map(tech => tech.id).join(',');

            
            editingProjectId = projectId;
            
            document.querySelector('#project-form button[type="submit"]').textContent = 'Atualizar Projeto';

            showMessage('Modo de edição ativado. Altere os campos e clique em "Atualizar Projeto".', 'success');

        } catch (error) {
            console.error('Erro ao carregar projeto para edição:', error);
            showMessage(`Erro ao carregar projeto para edição: ${error.message}`, 'error');
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    fetchProjetos(); 
});