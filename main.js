import { auth, googleProvider, db } from './firebase-config.js';

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
    getDocs,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');

const userPhotoEl = document.getElementById('user-photo');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');

const emptyState = document.getElementById('empty-state');
const tripContent = document.getElementById('trip-content');
const createFirstTripBtn = document.getElementById('create-first-trip-btn');

const tripSelect = document.getElementById('trip-select');
const newTripBtn = document.getElementById('new-trip-btn');
const editTripBtn = document.getElementById('edit-trip-btn');
const deleteTripBtn = document.getElementById('delete-trip-btn');

const tripStartDateInput = document.getElementById('trip-start-date');
const tripEndDateInput = document.getElementById('trip-end-date');

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

const cardModal = document.getElementById('card-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const saveModalBtn = document.getElementById('save-modal-btn');
const deleteCardModalBtn = document.getElementById('delete-card-modal-btn');

const modalCardTitle = document.getElementById('modal-card-title');
const modalAuthorInfo = document.getElementById('modal-author-info');
const modalCardDate = document.getElementById('modal-card-date');
const modalCardDesc = document.getElementById('modal-card-desc');
const modalCardLink = document.getElementById('modal-card-link');
const modalCardCost = document.getElementById('modal-card-cost');

const modalChecklistItems = document.getElementById('modal-checklist-items');
const newChecklistInput = document.getElementById('new-checklist-input');
const addChecklistBtn = document.getElementById('add-checklist-btn');

let currentUser = null;
let currentTripId = null;
let currentTripData = null;
let activeEditingCardId = null;
let activeChecklist = [];

let unsubscribeCards = null;
let unsubscribeTrips = null;

googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Erro ao fazer login com o Google: ", error);
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

function initDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach((column) => {
        const targetColumnKey = column.getAttribute('data-column');

        column.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessário para permitir a soltura
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            const cardId = e.dataTransfer.getData('text/plain');
            if (cardId && targetColumnKey) {
                await moveCard(cardId, targetColumnKey);
            }
        });
    });
}

initDragAndDrop();

function listenToUserTrips(user) {
    const tripsRef = collection(db, 'trips');
    const q = query(tripsRef, where('members', 'array-contains', user.email));

    if (unsubscribeTrips) unsubscribeTrips();

    unsubscribeTrips = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            currentTripId = null;
            currentTripData = null;
            tripSelect.innerHTML = '';
            emptyState.classList.remove('hidden');
            tripContent.classList.add('hidden');
            clearKanban();
            return;
        }

        emptyState.classList.add('hidden');
        tripContent.classList.remove('hidden');

        tripSelect.innerHTML = '';
        const trips = [];

        snapshot.forEach((docSnap) => {
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

async function handleCreateTrip() {
    const title = prompt("Digite o nome da nova viagem (Ex: Férias em Paris):");
    if (!title || !title.trim()) return;

    try {
        const docRef = await addDoc(collection(db, 'trips'), {
            title: title.trim(),
            createdBy: currentUser.uid,
            members: [currentUser.email],
            createdAt: serverTimestamp(),
            startDate: '',
            endDate: ''
        });
        currentTripId = docRef.id;
    } catch (error) {
        console.error("Erro ao criar nova viagem:", error);
        alert("Erro ao criar viagem.");
    }
}

newTripBtn.addEventListener('click', handleCreateTrip);
createFirstTripBtn.addEventListener('click', handleCreateTrip);

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

editTripBtn.addEventListener('click', async () => {
    if (!currentTripData) return;

    const newTitle = prompt("Novo nome para a viagem:", currentTripData.title);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTripData.title) return;

    try {
        const tripRef = doc(db, 'trips', currentTripId);
        await updateDoc(tripRef, { title: newTitle.trim() });
    } catch (error) {
        console.error("Erro ao renomear viagem:", error);
        alert("Erro ao renomear viagem.");
    }
});

deleteTripBtn.addEventListener('click', async () => {
    if (!currentTripData) return;

    const confirmation = confirm(`Deseja realmente excluir a viagem "${currentTripData.title}"?\n\nAtenção: Todos os passeios e itens desta viagem também serão apagados para todos os membros!`);
    if (!confirmation) return;

    try {
        const cardsQuery = query(collection(db, 'cards'), where('tripId', '==', currentTripId));
        const cardsSnapshot = await getDocs(cardsQuery);

        const batch = writeBatch(db);
        cardsSnapshot.forEach((cardDoc) => {
            batch.delete(cardDoc.ref);
        });

        const tripRef = doc(db, 'trips', currentTripId);
        batch.delete(tripRef);

        await batch.commit();

        currentTripId = null;
        currentTripData = null;
        alert("Viagem excluída com sucesso.");
    } catch (error) {
        console.error("Erro ao excluir viagem:", error);
        alert("Erro ao excluir viagem.");
    }
});

tripStartDateInput.addEventListener('change', async (e) => {
    if (!currentTripId) return;
    const startDateVal = e.target.value;

    if (startDateVal) {
        tripEndDateInput.min = startDateVal;
    }

    try {
        await updateDoc(doc(db, 'trips', currentTripId), { startDate: startDateVal });
    } catch (error) {
        console.error("Erro ao salvar data de início:", error);
    }
});

tripEndDateInput.addEventListener('click', () => {

    if (!tripEndDateInput.value && tripStartDateInput.value) {
        tripEndDateInput.value = tripStartDateInput.value;
    }
});

tripEndDateInput.addEventListener('change', async (e) => {
    if (!currentTripId) return;
    try {
        await updateDoc(doc(db, 'trips', currentTripId), { endDate: e.target.value });
    } catch (error) {
        console.error("Erro ao salvar data de fim:", error);
    }
});

function updateCurrentTripView(tripData) {
    if (!tripData) return;

    currentTripData = tripData;
    tripMembersContainer.classList.remove('hidden');
    membersList.innerHTML = '';

    const isOwner = tripData.createdBy === currentUser.uid;

    if (isOwner) {
        editTripBtn.classList.remove('hidden');
        deleteTripBtn.classList.remove('hidden');
        leaveTripBtn.classList.add('hidden');
    } else {
        editTripBtn.classList.add('hidden');
        deleteTripBtn.classList.add('hidden');
        leaveTripBtn.classList.remove('hidden');
    }

    tripStartDateInput.value = tripData.startDate || '';
    tripEndDateInput.value = tripData.endDate || '';

    tripData.members.forEach((email) => {
        const badge = document.createElement('span');
        badge.className = 'member-badge';
        
        const labelText = email === currentUser.email ? 'Você' : email;
        badge.textContent = labelText;

        if (isOwner && email !== currentUser.email) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-member-btn';
            removeBtn.textContent = '✕';
            removeBtn.title = `Remover ${email} da viagem`;
            removeBtn.onclick = () => removeMember(email);
            badge.appendChild(removeBtn);
        }

        membersList.appendChild(badge);
    });

    listenToCards(currentTripId);
}

async function removeMember(emailToRemove) {
    if (confirm(`Deseja remover ${emailToRemove} desta viagem?`)) {
        try {
            const tripRef = doc(db, 'trips', currentTripId);
            await updateDoc(tripRef, {
                members: arrayRemove(emailToRemove)
            });
        } catch (error) {
            console.error("Erro ao remover membro:", error);
            alert("Erro ao remover membro.");
        }
    }
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
            authorName: currentUser.displayName || 'Viajante',
            createdAt: serverTimestamp(),
            description: '',
            scheduledDate: '',
            link: '',
            cost: '',
            checklist: []
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
    cardDiv.draggable = true;
    
    cardDiv.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        cardDiv.classList.add('dragging');
    });

    cardDiv.addEventListener('dragend', () => {
        cardDiv.classList.remove('dragging');
    });

    cardDiv.onclick = (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('.card-actions')) return;
        openCardModal(id, data);
    };

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
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            moveCard(id, getPreviousColumn(data.column));
        };
        actionsDiv.appendChild(prevBtn);
    }

    if (data.column !== 'done') {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'card-action-btn';
        nextBtn.textContent = '➡️';
        nextBtn.title = 'Mover para direita';
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            moveCard(id, getNextColumn(data.column));
        };
        actionsDiv.appendChild(nextBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-action-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Excluir item';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteCard(id);
    };
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

async function moveCard(id, targetColumn) {
    try {
        const cardRef = doc(db, 'cards', id);
        await updateDoc(cardRef, { column: targetColumn });
    } catch (error) {
        console.error("Erro ao mover cartão: ", error);
    }
}

async function deleteCard(id) {
    if (confirm("Deseja realmente remover este item da sua viagem?")) {
        try {
            await deleteDoc(doc(db, 'cards', id));
        } catch (error) {
            console.error("Erro ao excluir o cartão:", error);
        }
    }
}

function openCardModal(id, data) {
    activeEditingCardId = id;
    activeChecklist = [...(data.checklist || [])];

    modalCardTitle.value = data.title || '';
    modalAuthorInfo.textContent = `👤 Adicionado por: ${data.authorName || 'Viajante'}`;
    
    if (data.scheduledDate) {
        modalCardDate.value = data.scheduledDate;
    } else if (currentTripData && currentTripData.startDate) {
        modalCardDate.value = `${currentTripData.startDate}T09:00`;
    } else {
        modalCardDate.value = '';
    }

    modalCardDesc.value = data.description || '';
    modalCardLink.value = data.link || '';
    modalCardCost.value = data.cost || '';

    renderChecklist();
    cardModal.classList.remove('hidden');
}

function closeCardModal() {
    activeEditingCardId = null;
    activeChecklist = [];
    cardModal.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeCardModal);
cancelModalBtn.addEventListener('click', closeCardModal);

saveModalBtn.addEventListener('click', async () => {
    if (!activeEditingCardId) return;

    try {
        const cardRef = doc(db, 'cards', activeEditingCardId);
        await updateDoc(cardRef, {
            title: modalCardTitle.value.trim() || 'Sem título',
            scheduledDate: modalCardDate.value,
            description: modalCardDesc.value.trim(),
            link: modalCardLink.value.trim(),
            cost: modalCardCost.value,
            checklist: activeChecklist
        });
        closeCardModal();
    } catch (error) {
        console.error("Erro ao salvar detalhes do cartão:", error);
        alert("Erro ao salvar alterações.");
    }
});

deleteCardModalBtn.addEventListener('click', async () => {
    if (!activeEditingCardId) return;
    if (confirm("Deseja realmente excluir este cartão?")) {
        try {
            await deleteDoc(doc(db, 'cards', activeEditingCardId));
            closeCardModal();
        } catch (error) {
            console.error("Erro ao excluir cartão pelo modal:", error);
        }
    }
});

addChecklistBtn.addEventListener('click', () => {
    const text = newChecklistInput.value.trim();
    if (!text) return;

    activeChecklist.push({ text: text, done: false });
    newChecklistInput.value = '';
    renderChecklist();
});

function renderChecklist() {
    modalChecklistItems.innerHTML = '';
    activeChecklist.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `checklist-item ${item.done ? 'done' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.done;
        checkbox.onchange = () => {
            activeChecklist[index].done = checkbox.checked;
            renderChecklist();
        };

        const span = document.createElement('span');
        span.textContent = item.text;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = '✕';
        removeBtn.onclick = () => {
            activeChecklist.splice(index, 1);
            renderChecklist();
        };

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(span);
        itemDiv.appendChild(removeBtn);
        modalChecklistItems.appendChild(itemDiv);
    });
}