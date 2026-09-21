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
    getDoc,
    query, 
    where, 
    onSnapshot, 
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');

const userPhotoEl = document.getElementById('user-photo');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');

const tripSelect = document.getElementById('trip-select');
const newTripBtn = document.getElementById('new-trip-btn');
const tripMembersContainer = document.getElementById('trip-members-container');
const membersList = document.getElementById('members-list');
const shareTripBtn = document.getElementById('share-trip-btn');
const leaveTripBtn = document.getElementById('leave-trip-btn');

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
let currentTripId = null;
let currentTripData = null;

let unsubscribeCards = null;
let unsubscribeTrips = null;


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

        listenToUserTrips(user);
    } else {
        currentUser = null;
        currentTripId = null;
        currentTripData = null;

        if (unsubscribeCards) unsubscribeCards();
        if (unsubscribeTrips) unsubscribeTrips();

        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        clearKanban();
    }
});

function listenToUserTrips(user){
    const tripsRef = collection(db,'trips');
    const q = query(tripsRef, where('members', 'array-contains', user.email));

    if(unsubscribeTrips) unsubscribeTrips();

    unsubscribeTrips = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty){
            await createInitialTrip(user);
            return;
        }

        tripSelect.innerHTML = '';
        const trips = [];

        snapshot.forEach((docSnap) =>{
            trips.push({ id: docSnap.id, ...docSnap.data() });
        });

        trips.forEach((trip) => {
            const option = document.createElement('option');
            option.value = trip.id;
            option.textContent = trip.title;
            tripSelect.appendChild(option);
        });   
        
        const tripExists = trips.some(t => t.id === currentTripId);
        if (!tripExists) {
            currentTripId = trips[0].id;
        }

        tripSelect.value = currentTripId;
        updateCurrentTripView(trips.find(t => t.id === currentTripId));
    }, (error) => {
        console.error("Erro ao carregar viagens:", error);
    });
}

async function createInitialTrip(user) {
    try{
        const docRef = await addDoc(collection(db, 'trips'), {
            title:'Minha Primeira Viagem ✈️',
            createdBy: user.uid,
            members: [user.email],
            createdAt: serverTimestamp()
        });
        currentTripId = docRef.id;
    } catch (error) {
        console.error("Erro ao criar viagem inicial: ", error);
    }
}

tripSelect.addEventListener('change', async (e) => {
    currentTripId = e.target.value;

    try {
        const tripRef = doc(db, 'trips', currentTripId);
        const docSnap = await getDoc(tripRef);

        if (docSnap.exists()) {
            updateCurrentTripView({ id: docSnap.id, ...docSnap.data() });
        }
    } catch (error) {
        console.error("Erro ao alternar de viagem:", error);
    }
});

newTripBtn.addEventListener('click', async () => {
    const title = prompt("Digite o nome da nova viagem (Ex: Férias em Paris):");
    if (!title || !title.trim()) return;

    try {
        const docRef = await addDoc(collection(db, 'trips'), {
            title: title.trim(),
            createdBy: currentUser.uid,
            members: [currentUser.email],
            createdAt: serverTimestamp()
        });
        currentTripId = docRef.id;
    } catch (error) {
        console.error("Erro ao criar nova viagem:", error);
        alert("Erro ao criar viagem.");
    }
});

function updateCurrentTripView(tripData) {
    if(!tripData) return;

    currentTripData = tripData;
    tripMembersContainer.classList.remove('hidden');
    membersList.innerHTML = '';

    tripData.members.forEach((email) => {
        const badge = document.createElement('span');
        badge.className = 'member-badge';
        badge.textContent = email === currentUser.email ? 'Você' : email;
        membersList.appendChild(badge);
    });

    if (tripData.createdBy !== currentUser.uid) {
        leaveTripBtn.classList.remove('hidden');
    } else {
        leaveTripBtn.classList.add('hidden');
    }

    listenToCards(currentTripId);
}

shareTripBtn.addEventListener('click', async () => {
    const email = prompt("Digite o e-mail do amigo para compartilhar a viagem:");
    if (!email || !email.trim()) return;

    const formattedEmail = email.trim().toLowerCase();

    if (currentTripData.members.includes(formattedEmail)) {
        alert("Este e-mail já é um membro da viagem!");
        return;
    }

    try {
        const tripRef = doc(db, 'trips', currentTripId);
        await updateDoc(tripRef, {
            members: arrayUnion(formattedEmail) 
        });
        alert("Amigo adicionado com sucesso!");
    } catch (error) {
        console.error("Erro ao compartilhar viagem:", error);
        alert("Erro ao adicionar membro.");
    }
});

leaveTripBtn.addEventListener('click', async () => {
    if (confirm(`Deseja realmente sair da viagem "${currentTripData.title}"?`)) {
        try {
            const tripRef = doc(db, 'trips', currentTripId);
            await updateDoc(tripRef, {
                members: arrayRemove(currentUser.email) 
            });
            currentTripId = null;
        } catch (error) {
            console.error("Erro ao sair da viagem:", error);
        }
    }
});

addCardForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = cardTitleInput.value.trim();
    const column = cardColumnSelect.value;

    if (!title || !currentUser || !currentTripId) return;

    try {
        await addDoc(collection(db, 'cards'), {
            title: title,
            column: column,
            tripId: currentTripId, 
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
        });
        cardTitleInput.value = '';
    } catch (error) {
        console.error("Erro ao adicionar cartão:", error);
        alert("Erro ao salvar item.");
    }
});

function listenToCards(tripId) {
    const cardsRef = collection(db, 'cards');
    const q = query(cardsRef, where('tripId', '==', tripId));

    if (unsubscribeCards) unsubscribeCards();

    unsubscribeCards = onSnapshot(q, (snapshot) => {
        clearKanban();

        const columnCounts = { ideas: 0, todo: 0, done: 0 };

        snapshot.forEach((docSnap) => {
            const cardData = docSnap.data();
            const cardId = docSnap.id;

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
        console.error("Erro ao carregar cartões:", error);
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