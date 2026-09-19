import {auth, googleProvider, db} from './firebase-config.js';

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    collection, 
    addDoc, 
    deleteDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');

const userPhotoEl = document.getElementById('user-photo');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');

const addCardForm = document.getElementById('add-card-form');
const cardTitleInput = document.getElementById('card-title-input');
const cardColumnSelect = document.getElementById('card-column-select');

const columnBodies = {
    ideas: document.getElementById('column-ideas'),
    todo: document.getElementById('column-todo'),
    done: document.getElementById('column-done')
};

const counts = {
    ideas: document.getElementById('count-ideas'),
    todo: document.getElementById('count-todo'),
    done: document.getElementById('count-done')
};

let currentUser = null;
let unsubscribeSnapshot = null;


googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error){
        console.error("Erro ao fazer login com o Google: ",error);
        alert("Não foi possível realizar o login. Tente novamente");
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout: ", error);
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;

        userNameEl.textContent = user.displayName || "Viajante";
        userEmailEl.textContent = user.email || "";

        const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'V')}&background=4f46e5&color=fff`;
        userPhotoEl.src = user.photoURL || fallbackAvatar;
        userPhotoEl.onerror = () => { userPhotoEl.src = fallbackAvatar; };

        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');

        listenToCards(user.uid);
    } else {
        currentUser = null;

        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }

        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        clearKanban();
    }
});

addCardForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = cardTitleInput.value.trim();
    const column = cardColumnSelect.value;

    if (!title || !currentUser) return;

    try {
        await addDoc(collection(db, 'cards'), {
            title: title,
            column: column,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
        });
        cardTitleInput.value = '';
    } catch (error) {
        console.error("Erro ao adcionar cartão: ", error);
        alert("Erro ao salvar o item. Verifique sua conexão.");
    }
});

function listenToCards(userId) {
    const cardsRef = collection(db, 'cards');
    const q = query(cardsRef, where('userId', '==', userId));

    if(unsubscribeSnapshot) unsubscribeSnapshot();

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        clearKanban();

        const columnCounts = {ideas: 0, todo: 0, done: 0};
        snapshot.forEach((docSnapshot) => {
            const cardData = docSnapshot.data();
            const cardId = docSnapshot.id;

            if (columnBodies[cardData.column]) {
                            const cardElement = createCardElement(cardId, cardData);
                            columnBodies[cardData.column].appendChild(cardElement);
                            columnCounts[cardData.column]++;
            }            
        });

        counts.ideas.textContent = columnCounts.ideas;
        counts.todo.textContent = columnCounts.todo;
        counts.done.textContent = columnCounts.done;
    }, (error) => {
        console.error("Erro ao carregar cartões em tempo real: ", error);
    });
}

function clearKanban() {
    Object.values(columnBodies).forEach(column => column.innerHTML = '');
    Object.values(counts).forEach(count => count.textContent = '0');
}

function createCardElement(id, data) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'kanban-card';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = data.title;
    cardDiv.appendChild(titleSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions';

    if (data.column !== 'ideas') {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'card-action-btn';
        prevBtn.textContent = '⬅️';
        prevBtn.title = 'Mover para esquerda';
        prevBtn.onclick = () => moveCard(id, getPreviousColumn(data.column));
        actionsDiv.appendChild(prevBtn);
    }

    if (data.column !== 'done') {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'card-action-btn';
        nextBtn.textContent = '➡️';
        nextBtn.title = 'Mover para direita';
        nextBtn.onclick = () => moveCard(id, getNextColumn(data.column));
        actionsDiv.appendChild(nextBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-action-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Excluir item';
    deleteBtn.onclick = () => deleteCard(id);
    actionsDiv.appendChild(deleteBtn);

    cardDiv.appendChild(actionsDiv);
    return cardDiv;

}

function getNextColumn(currentColumn) {
    if (currentColumn === 'ideas') return 'todo';
    if (currentColumn === 'todo') return 'done';
    return currentColumn;
}

function getPreviousColumn(currentColumn) {
    if (currentColumn === 'done') return 'todo';
    if (currentColumn === 'todo') return 'ideas';
    return currentColumn;
}

async function moveCard(id,targetColumn) {
    try{
        const cardRef = doc(db, 'cards', id);
        await updateDoc(cardRef, { column: targetColumn});
    } catch (error) {
        console.error("Erro ao mover cartão: ", error);
    }
}

async function deleteCard(id) {
    if(confirm("Deseja realmente remover este item da sua viagem?")){
        try {
            await deleteDoc(doc(db, 'cards', id));
        } catch (error) {
            console.error("Erro ao excluir o cartão:", error);
        }
    }
}