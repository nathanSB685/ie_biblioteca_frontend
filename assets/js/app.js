// CONFIGURAÇÕES GERAIS E SEGURANÇA
const API_URL = "https://ie-projeto-biblioteca-api.onrender.com/api";

// Função que roda automaticamente toda vez que qualquer página carrega
document.addEventListener("DOMContentLoaded", () => {
  atualizarMenu();
  protegerPaginas();

  // Identifica qual página estamos e carrega os dados certos
  const paginaAtual = window.location.pathname;

  if (
    paginaAtual.includes("home.html") ||
    paginaAtual === "/" ||
    paginaAtual === ""
  )
    carregarLivros();

  if (paginaAtual.includes("meus-emprestimos.html")) carregarMeusEmprestimos();

  if (paginaAtual.includes("painel-biblio.html")) carregarTodosEmprestimos();
});

// Muda os botões do cabeçalho dependendo se o usuário tem ou não o Token
function atualizarMenu() {
  const token = localStorage.getItem("token_biblioteca");
  const navButtons = document.querySelector(".nav-buttons");

  if (!navButtons) return;

  if (token) {
    // Usuário LOGADO
    navButtons.innerHTML = `
            <button onclick="window.location.href='home.html'">Área do Estudante</button>
            <button onclick="window.location.href='meus-emprestimos.html'">Meu Histórico</button>
            <button onclick="window.location.href='painel-biblio.html'">Área do Funcionário</button>
            <button onclick="fazerLogout()" style="background-color: #e74c3c; margin-left: 20px;">Sair</button>
        `;
  } else {
    // Usuário DESLOGADO
    navButtons.innerHTML = `
            <button onclick="window.location.href='index.html'" style="background-color: #1abc9c;">Fazer Login</button>
        `;
  }
}

function obterPerfilDoUsuario() {
  const token = localStorage.getItem("token_biblioteca");
  if (!token) return "ALUNO"; // Se não tiver token, assume aluno por segurança

  try {
    // O JWT tem 3 partes separadas por ponto. A do meio (payload) tem os dados!
    const payload = token.split(".")[1];
    const dadosDecodificados = JSON.parse(atob(payload));
    return dadosDecodificados.perfil || "ALUNO";
  } catch (e) {
    return "ALUNO";
  }
}

// Expulsa o usuário para a tela de login se ele tentar acessar áreas restritas
function protegerPaginas() {
  const token = localStorage.getItem("token_biblioteca");
  const paginaAtual = window.location.pathname;
  const paginasProtegidas = [
    "home.html",
    "cadastrar-livro.html",
    "meus-emprestimos.html",
    "painel-biblio.html",
  ];

  const precisaProteger = paginasProtegidas.some((pag) =>
    paginaAtual.includes(pag)
  );

  if (precisaProteger && !token) {
    alert("Você precisa fazer login para acessar o sistema.");
    window.location.href = "index.html";
  }
}

// AUTENTICAÇÃO (LOGIN / LOGOUT)
async function logarUsuario() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    const resposta = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const dados = await resposta.json();

    if (dados.token) {
      localStorage.setItem("token_biblioteca", dados.token);
      window.location.href = "home.html"; // Vai para a tela inicial
    } else {
      alert(
        "Erro: " + (dados.erro || "Falha no login. Verifique suas credenciais.")
      );
    }
  } catch (erro) {
    alert("Erro de conexão com o servidor.");
    console.error(erro);
  }
}

function fazerLogout() {
  localStorage.removeItem("token_biblioteca");
  window.location.href = "index.html";
}

async function cadastrarUsuario() {
  const nome = document.getElementById("novo-nome").value;
  const email = document.getElementById("novo-email").value;
  const senha = document.getElementById("nova-senha").value;

  try {
    const resposta = await fetch(`${API_URL}/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome,
        email: email,
        senha: senha,
      }),
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      alert("Conta criada com sucesso! Agora você pode fazer o login.");
      window.location.href = "index.html"; // Manda o usuário para a tela de login
    } else {
      alert("Erro ao criar conta: " + (dados.erro || dados.mensagem));
    }
  } catch (erro) {
    alert("Erro de conexão com o servidor.");
    console.error(erro);
  }
}

async function carregarLivros() {
  const token = localStorage.getItem("token_biblioteca");
  const divResultados = document.getElementById("resultado-livros");

  if (!divResultados) return; // Só roda se a div existir na página

  divResultados.innerHTML =
    "<p style='text-align: center; color: #666;'>Carregando acervo...</p>";

  try {
    const resposta = await fetch(`${API_URL}/livros`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const livros = await resposta.json();
    divResultados.innerHTML = ""; // Limpa o texto de "Carregando"

    if (livros.erro || livros.length === 0) {
      divResultados.innerHTML =
        "<p style='text-align: center; color: #666;'>Nenhum livro disponível no momento.</p>";
      return;
    }

    // Cria um Grid para os livros ficarem lado a lado
    let htmlLivros =
      '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">';

    const perfilUsuario = obterPerfilDoUsuario();

    livros.forEach((livro) => {
      const temEstoque = livro.quantidade_disponivel > 0;
      let botaoHtml = "";

      // Se for Bibliotecário, mostra o botão vermelho de exclusão
      if (perfilUsuario === "BIBLIOTECARIO") {
        botaoHtml = `<button style="background-color: #e74c3c; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;" onclick="removerLivroCatalogo(${livro.id})">Remover do Catálogo</button>`;
      }
      // Se for Aluno, mostra a lógica normal de empréstimo
      else {
        botaoHtml = temEstoque
          ? `<button class="btn-verde" onclick="solicitarEmprestimo(${livro.id})">Pegar Emprestado</button>`
          : `<button class="btn-cinza" disabled style="cursor: not-allowed;">Esgotado</button>`;
      }

      const tituloParaBusca = encodeURIComponent(livro.titulo);
      const urlCapa = `https://covers.openlibrary.org/b/title/${tituloParaBusca}-M.jpg`;

      const capaGenerica =
        "https://via.placeholder.com/150x220/e0e0e0/555555?text=Sem+Capa";

      // Monta o Card do Livro
      htmlLivros += `
                <div class="card-livro-js" style="display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: center;">
                    
                    <div style="display: flex; justify-content: center; margin-bottom: 15px;">
                        <!-- Aqui está a mágica: O atributo onerror troca para a capa genérica se a busca falhar -->
                        <img src="${urlCapa}" onerror="this.src='${capaGenerica}'" alt="Capa de ${
        livro.titulo
      }" style="width: 140px; height: 200px; object-fit: cover; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    </div>

                    <div>
                        <h3 style="color: #2b3945; margin-bottom: 8px; font-size: 1.1rem; min-height: 40px;">${
                          livro.titulo
                        }</h3>
                        <p style="color: #555; margin-bottom: 5px; font-size: 0.9rem;"><strong>Autor:</strong> ${
                          livro.autor
                        }</p>
                        <p style="color: #555; margin-bottom: 5px; font-size: 0.9rem;"><strong>Gênero:</strong> ${
                          livro.genero
                        }</p>
                        <p style="color: #555; margin-bottom: 15px; font-size: 0.9rem;"><strong>Editora:</strong> ${
                          livro.editora
                        }</p>
                    </div>

                    <div>
                        <p style="color: ${
                          temEstoque ? "#27ae60" : "#e74c3c"
                        }; font-weight: bold; margin-bottom: 15px;">
                            Estoque: ${livro.quantidade_disponivel}
                        </p>
                        ${botaoHtml}
                    </div>
                </div>
            `;
    });

    htmlLivros += "</div>";
    divResultados.innerHTML = htmlLivros;
  } catch (erro) {
    console.error("Erro ao buscar livros:", erro);
    divResultados.innerHTML =
      "<p style='text-align: center; color: red;'>Erro ao carregar o acervo. Verifique a conexão com a API.</p>";
  }
}

// Função para filtrar os livros pelos botões de gênero
function filtrarPorGenero(generoEscolhido) {
  const cardsLivros = document.querySelectorAll(".card-livro-js");

  cardsLivros.forEach((card) => {
    // Pega todo o texto visível dentro do card
    const textoCard = card.innerText;

    // Se escolheu 'Todos', volta a mostrar em formato flexível (como desenhamos o card)
    if (generoEscolhido === "Todos") {
      card.style.display = "flex";
      return;
    }

    // Verifica se a string "Gênero: [Nome do Gênero]" está escrita dentro do card
    if (textoCard.includes(`Gênero: ${generoEscolhido}`)) {
      card.style.display = "flex"; // Mostra o card
    } else {
      card.style.display = "none"; // Esconde o card
    }
  });
}

// Função para a Barra de Pesquisa funcionar no Front-end
function buscarLivro() {
  const termoBusca = document.getElementById("buscaLivro").value.toLowerCase();
  const cardsLivros = document.querySelectorAll(".card-livro-js"); // Pega todos os cards gerados

  cardsLivros.forEach((card) => {
    const textoCard = card.innerText.toLowerCase();
    // Se o texto do card inclui o que foi digitado, mostra. Se não, esconde.
    if (textoCard.includes(termoBusca)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

// INTELIGÊNCIA ARTIFICIAL E CADASTRO
async function lerCapaComIA() {
  const inputFoto = document.getElementById("inputFoto");
  const arquivo = inputFoto.files[0];
  const token = localStorage.getItem("token_biblioteca");

  if (!arquivo) return alert("Selecione uma imagem da capa primeiro!");

  const formData = new FormData();
  formData.append("imagem", arquivo);

  // Muda o texto do botão para mostrar que está pensando
  const btnIA = document.querySelector('button[onclick="lerCapaComIA()"]');
  btnIA.innerText = "Lendo com IA...";
  btnIA.disabled = true;

  try {
    const resposta = await fetch(`${API_URL}/ler-capa`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const dados = await resposta.json();

    if (dados.titulo) {
      // Preenche os inputs do HTML automaticamente!
      document.getElementById("titulo").value = dados.titulo;
      document.getElementById("autor").value = dados.autor;
      document.getElementById("editora").value = dados.editora;
      document.getElementById("genero").value = dados.genero || "";
      alert("Capa lida com sucesso!");
    } else {
      alert("A IA não conseguiu ler a capa direito.");
    }
  } catch (erro) {
    alert("Erro na IA.");
  } finally {
    btnIA.innerText = "Ler Capa";
    btnIA.disabled = false;
  }
}

async function salvarLivro() {
  const titulo = document.getElementById("titulo").value;
  const autor = document.getElementById("autor").value;
  const editora = document.getElementById("editora").value;
  const genero = document.getElementById("genero").value;

  // Pegamos o valor do input e garantimos que é um número (parseInt)
  const quantidade = parseInt(document.getElementById("quantidade").value, 10);
  const token = localStorage.getItem("token_biblioteca");

  try {
    const resposta = await fetch(`${API_URL}/livros`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ titulo, autor, editora, quantidade, genero }),
    });

    const resultado = await resposta.json();

    if (resposta.ok) {
      alert("Livro cadastrado com sucesso!");
      window.location.href = "home.html";
    } else {
      alert("Erro: " + (resultado.erro || "Falha ao cadastrar"));
    }
  } catch (erro) {
    console.error("Erro na requisição:", erro);
    alert("Erro de conexão ao tentar salvar o livro.");
  }
}

// HISTÓRICO E EMPRÉSTIMOS
async function carregarMeusEmprestimos() {
  const token = localStorage.getItem("token_biblioteca");
  const tabela = document.getElementById("tabela-historico");

  if (!tabela) return;

  try {
    const resposta = await fetch(`${API_URL}/meus-emprestimos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const historico = await resposta.json();
    tabela.innerHTML = "";

    if (historico.erro) {
      tabela.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">${historico.erro}</td></tr>`;
      return;
    }

    if (historico.length === 0) {
      tabela.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Você ainda não pegou nenhum livro emprestado.</td></tr>`;
      return;
    }

    historico.forEach((emp) => {
      const dataEmp = new Date(emp.data_emprestimo).toLocaleDateString("pt-BR");
      const dataDev = new Date(emp.data_devolucao_prevista).toLocaleDateString(
        "pt-BR"
      );

      tabela.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;"><strong>${
                  emp.titulo
                }</strong><br><small>${emp.autor}</small></td>
                <td style="padding: 12px;">${dataEmp}</td>
                <td style="padding: 12px;">${dataDev}</td>
                <td style="padding: 12px; font-weight: bold; color: ${
                  emp.status === "DEVOLVIDO" ? "#27ae60" : "#e67e22"
                };">${emp.status}</td>
            </tr>
        `;
    });
  } catch (erro) {
    console.error("Erro ao carregar histórico:", erro);
    tabela.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Erro de conexão com o servidor.</td></tr>`;
  }
}

async function solicitarEmprestimo(livroId) {
  // Pede uma confirmação para o usuário não clicar sem querer
  if (
    !confirm(
      "Deseja confirmar o empréstimo deste livro? O prazo de devolução é de 7 dias."
    )
  )
    return;

  const token = localStorage.getItem("token_biblioteca");

  try {
    const resposta = await fetch(`${API_URL}/emprestimos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // apenas o ID do livro, o ID do usuário o backend descobre pelo Token
      body: JSON.stringify({ livro_id: livroId }),
    });

    const resultado = await resposta.json();

    if (resposta.ok) {
      alert("Sucesso! O livro foi adicionado ao seu histórico.");
      carregarLivros();
    } else {
      alert("Erro: " + (resultado.erro || "Não foi possível pegar o livro."));
    }
  } catch (erro) {
    console.error("Erro na requisição:", erro);
    alert("Erro de conexão ao tentar pegar o livro.");
  }
}

// Painel da Bibliotecária
async function carregarTodosEmprestimos() {
  const token = localStorage.getItem("token_biblioteca");
  const tabela = document.getElementById("tabela-todos-emprestimos");

  if (!tabela) return;

  try {
    const resposta = await fetch(`${API_URL}/todos-emprestimos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const historico = await resposta.json();
    tabela.innerHTML = "";

    if (historico.length === 0) {
      tabela.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum empréstimo registrado no sistema.</td></tr>`;
      return;
    }

    historico.forEach((emp) => {
      const dataDev = new Date(emp.data_devolucao_prevista).toLocaleDateString(
        "pt-BR"
      );
      const estaAtivo = emp.status_atual === "ATIVO";
      const corStatus = estaAtivo ? "#e67e22" : "#27ae60";

      const botaoAcao = estaAtivo
        ? `<button class="btn-verde" style="padding: 5px 10px; font-size: 0.9rem;" onclick="registrarDevolucaoLivro(${emp.emprestimo_id})">Confirmar Devolução</button>`
        : `<button class="btn-cinza" style="padding: 5px 10px; font-size: 0.9rem;" disabled>Já Devolvido</button>`;

      tabela.innerHTML += `
                <tr class="linha-emprestimo-js" style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px; font-weight: bold;" class="nome-aluno-js">${emp.nome_aluno}</td>
                    <td style="padding: 15px;">${emp.titulo_livro}</td>
                    <td style="padding: 15px;">${dataDev}</td>
                    <td style="padding: 15px; font-weight: bold; color: ${corStatus};">${emp.status_atual}</td>
                    <td style="padding: 15px; text-align: center;">${botaoAcao}</td>
                </tr>
            `;
    });
  } catch (erro) {
    console.error("Erro ao carregar o painel geral:", erro);
  }
}

function buscarAlunoEmprestimo() {
  const termoBusca = document.getElementById("buscaAluno").value.toLowerCase();

  const linhas = document.querySelectorAll(".linha-emprestimo-js");

  linhas.forEach((linha) => {
    const nomeAluno = linha
      .querySelector(".nome-aluno-js")
      .innerText.toLowerCase();

    // Se o nome do aluno incluir o que foi digitado, mostra a linha. Senão, esconde.
    if (nomeAluno.includes(termoBusca)) {
      linha.style.display = ""; // Oculta a formatação e volta ao normal (mostra a linha)
    } else {
      linha.style.display = "none"; // Esconde a linha
    }
  });
}

async function confirmarDevolucao(emprestimoId) {
  if (!confirm("Tem certeza que este livro foi devolvido fisicamente?")) return;

  const token = localStorage.getItem("token_biblioteca");
  const resposta = await fetch(
    `${API_URL}/emprestimos/${emprestimoId}/devolucao`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const resultado = await resposta.json();

  if (resposta.ok) {
    alert("Devolução registrada com sucesso!");
    carregarTodosEmprestimos();
  } else {
    alert("Erro: " + resultado.erro);
  }
}

async function removerLivroCatalogo(livroId) {
  if (
    !confirm(
      "ALERTA: Tem certeza que deseja excluir este livro do catálogo? Essa ação não pode ser desfeita."
    )
  )
    return;

  const token = localStorage.getItem("token_biblioteca");

  try {
    const resposta = await fetch(`${API_URL}/livros/${livroId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const resultado = await resposta.json();

    if (resposta.ok) {
      alert("Livro removido do sistema com sucesso!");
      carregarLivros(); // Recarrega a vitrine para o livro sumir na hora
    } else {
      alert("Erro: " + (resultado.erro || "Falha ao remover."));
    }
  } catch (erro) {
    console.error("Erro na exclusão:", erro);
    alert("Erro de conexão ao tentar remover o livro.");
  }
}
