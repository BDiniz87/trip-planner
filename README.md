# ✈️ Trip Planner

Um planejador de viagens colaborativo desenvolvido para organizar ideias, reservas, compras e roteiro de viagem em um único lugar.

O **Trip Planner v3.0** utiliza autenticação com Google e Firebase Firestore para permitir que os dados das viagens sejam armazenados e sincronizados em tempo real.

## 🌐 Live Demo

**[Acessar o Trip Planner](https://bdiniz87.github.io/trip-planner/)**

---

## 📋 Sobre o projeto

O Trip Planner foi desenvolvido com o objetivo de criar uma aplicação web prática para planejamento de viagens.

Cada viagem pode possuir:

* 📅 Data de início e término
* 👥 Membros participantes
* 💡 Ideias e lugares para visitar
* 🗓️ Reservas e compras
* ✅ Itens confirmados e roteiro
* 💰 Custos estimados
* 🔗 Links úteis
* ☑️ Checklists e subtarefas
* 📝 Descrições e observações

A organização das atividades utiliza um sistema **Kanban**, permitindo mover os cartões entre diferentes etapas do planejamento.

---

## 🚀 Funcionalidades

### 🔐 Autenticação

* Login utilizando conta Google
* Autenticação através do Firebase Authentication
* Identificação do usuário conectado
* Exibição de nome, e-mail e foto de perfil
* Logout da aplicação

### ✈️ Gerenciamento de viagens

* Criar uma nova viagem
* Editar o nome da viagem
* Definir data de início e término
* Excluir uma viagem
* Visualizar apenas as viagens das quais o usuário participa
* Atualização dos dados em tempo real

### 👥 Viagens colaborativas

* Adicionar participantes através do e-mail
* Visualizar os membros da viagem
* Remover participantes
* Permitir que um participante saia da viagem
* Identificação do criador da viagem

### 🗂️ Organização em Kanban

As atividades da viagem são organizadas em três colunas:

* 💡 **Ideias & Lugares**
* 🗓️ **A Reservar / Comprar**
* ✅ **Confirmado & Roteiro**

Os cartões podem ser movimentados entre as colunas utilizando **drag and drop**.

### 📝 Cartões de planejamento

Cada cartão pode conter:

* Título
* Autor
* Data e horário programados
* Descrição
* Link útil
* Custo estimado
* Checklist de tarefas

Também é possível editar e excluir cartões.

### ☑️ Checklist

Cada cartão pode possuir uma lista de subtarefas.

Cada item pode ser marcado como concluído individualmente, permitindo acompanhar tarefas relacionadas à viagem.

### 🔄 Sincronização em tempo real

Os dados são sincronizados utilizando os listeners em tempo real do **Cloud Firestore**.

Isso permite que alterações realizadas na viagem sejam refletidas na aplicação sem a necessidade de atualizar manualmente a página.

---

## 🛠️ Tecnologias utilizadas

### Front-end

* HTML5
* CSS3
* JavaScript
* Google Fonts — Inter

### Back-end / Serviços

* Firebase Authentication
* Google Authentication
* Cloud Firestore

### Hospedagem

* GitHub Pages

---

## 🗄️ Estrutura do Firestore

A aplicação utiliza duas coleções principais no Cloud Firestore:

```text
trips
└── documentos das viagens

cards
└── documentos das atividades
```

Os cartões possuem um campo `tripId` que relaciona cada atividade à sua respectiva viagem.

### Coleção `trips`

Cada documento de viagem possui informações como:

```text
title
createdBy
members[]
createdAt
startDate
endDate
```

### Coleção `cards`

Cada cartão possui informações como:

```text
title
column
tripId
createdBy
authorName
createdAt
description
scheduledDate
link
cost
checklist[]
```

O campo `column` determina em qual etapa do Kanban o cartão será exibido.

---

## 🔄 Atualização em tempo real

A aplicação utiliza `onSnapshot()` do Firestore para acompanhar alterações nas coleções de viagens e cartões.

Dessa forma, operações como:

* criação de viagens;
* alteração de viagens;
* criação de cartões;
* edição de cartões;
* movimentação de cartões;
* exclusão de cartões;

podem ser refletidas automaticamente na interface.

---

## 🗑️ Exclusão de viagens

Ao excluir uma viagem, a aplicação também busca os cartões associados àquele `tripId` e realiza a exclusão dos documentos utilizando uma operação em lote (`writeBatch`).

Isso evita deixar cartões associados a uma viagem que não existe mais.

---

## 📱 Interface responsiva

A aplicação foi desenvolvida pensando em diferentes tamanhos de tela, permitindo o planejamento das viagens tanto em computadores quanto em dispositivos móveis.

A interface utiliza uma estrutura de cartões e colunas para facilitar a visualização e organização das informações.

---

## 📂 Estrutura do projeto

```text
trip-planner/
│
├── index.html
├── style.css
├── main.js
├── firebase-config.js
└── README.md
```

### Principais arquivos

**`index.html`**

Responsável pela estrutura da interface da aplicação, incluindo:

* tela de login;
* seleção de viagens;
* informações da viagem;
* membros;
* quadro Kanban;
* formulário de criação de cartões;
* modal de edição.

**`style.css`**

Responsável pela estilização da aplicação e pelo comportamento visual da interface.

**`main.js`**

Contém a lógica principal da aplicação, incluindo:

* autenticação;
* gerenciamento de usuários;
* gerenciamento de viagens;
* gerenciamento de membros;
* operações CRUD dos cartões;
* integração com Firestore;
* sincronização em tempo real;
* drag and drop;
* gerenciamento de checklists.

**`firebase-config.js`**

Responsável pela configuração e inicialização dos serviços Firebase utilizados pela aplicação.

---

## ⚙️ Como executar o projeto localmente

### 1. Clone o repositório

```bash
git clone https://github.com/BDiniz87/trip-planner.git
```

### 2. Acesse a pasta

```bash
cd trip-planner
```

### 3. Configure o Firebase

Crie um projeto no Firebase e configure:

* Firebase Authentication
* Login com Google
* Cloud Firestore

Depois, configure as credenciais do projeto no arquivo:

```text
firebase-config.js
```

### 4. Execute a aplicação

Como o projeto utiliza módulos JavaScript e serviços externos, recomenda-se executar utilizando um servidor local.

No VS Code, uma opção simples é utilizar a extensão **Live Server**.

Depois, abra o arquivo:

```text
index.html
```

com o Live Server.

---

## 🔥 Configuração do Firebase

O projeto utiliza os seguintes serviços do Firebase:

### Firebase Authentication

Utilizado para autenticar os usuários através da conta Google.

### Cloud Firestore

Utilizado para armazenar:

* viagens;
* participantes;
* cartões;
* checklists;
* informações relacionadas ao planejamento.

---

## 🎯 Objetivo

O projeto foi desenvolvido como parte do meu portfólio de desenvolvimento web, com o objetivo de praticar e demonstrar conhecimentos em:

* desenvolvimento Front-end;
* JavaScript;
* autenticação de usuários;
* banco de dados NoSQL;
* Firebase;
* operações CRUD;
* consultas no Firestore;
* sincronização em tempo real;
* manipulação do DOM;
* eventos;
* drag and drop;
* gerenciamento de estado;
* aplicações web colaborativas.

---

## 👨‍💻 Autor

**Bruno Diniz**

Desenvolvedor Web em formação, com foco em JavaScript, desenvolvimento de aplicações web e tecnologias relacionadas.

### 🔗 Links

* **GitHub:** [BDiniz87](https://github.com/BDiniz87)
* **Projeto:** [Trip Planner](https://github.com/BDiniz87/trip-planner)

---

## 📌 Status do projeto

**Versão atual: 3.0**

Projeto funcional e em evolução, desenvolvido para estudos e composição de portfólio.
