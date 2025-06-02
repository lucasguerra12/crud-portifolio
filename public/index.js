const API_URL = 'http://localhost:3000';


const projetosContainer = document.getElementById('projetos-dinamicos-container');


async function loadProjetos() {
    if (!projetosContainer) {
        console.error('Elemento #projetos-dinamicos-container não encontrado no index.html');
        return;
    }

    projetosContainer.innerHTML = '<p>Carregando seus projetos...</p>'; 

    try {
        const response = await fetch(`${API_URL}/projetos`); 
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const projetos = await response.json(); 

        projetosContainer.innerHTML = '';

        if (projetos.length === 0) {
            projetosContainer.innerHTML = '<p>Nenhum projeto cadastrado no momento.</p>';
            return;
        }

        
        projetos.forEach(projeto => {
            const projectItem = document.createElement('div');
            projectItem.className = 'projeto'; 

            
            let projectImageSrc = 'img/default-project.png'; 
            
            if (projeto.nome.includes('API - BYTETECH')) {
                projectImageSrc = 'img/api-vereadores.png';
            } else if (projeto.nome.includes('PROPEL SERVIÇOS')) {
                projectImageSrc = 'img/propel.jpg';
            } else if (projeto.nome.includes('API - DEBUGGERS')) {
                projectImageSrc = 'img/api-debuggers.png';
            } else if (projeto.nome.includes('HAKA COMPANY')) {
                projectImageSrc = 'img/haka.png';
            }
           

            projectItem.innerHTML = `
                <img src="${projectImageSrc}" alt="Imagem do Projeto ${projeto.nome}">
                <div class="descricao">
                    <h2>${projeto.nome}</h2>
                    <p>${projeto.descricao}</p>
                    <p><strong>Tecnologias:</strong> ${projeto.tecnologias.map(tech => tech.nome).join(', ')}</p>
                </div>
            `;
            projetosContainer.appendChild(projectItem);
        });

    } catch (error) {
        console.error('Erro ao carregar projetos do banco de dados:', error);
        projetosContainer.innerHTML = `<p style="color: red;">Erro ao carregar projetos. Verifique se o servidor da API está online e o CORS configurado.</p>`;
    }
}


document.addEventListener('DOMContentLoaded', loadProjetos);