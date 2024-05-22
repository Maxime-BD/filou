const socket = io();

document.getElementById('create-list-button').addEventListener('click', () => {
    const listName = document.getElementById('new-list-name').value;
    fetch('/api/lists', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: listName })
    })
        .then(response => response.json())
        .then(list => {
            addListToDom(list);
        });
});

function addListToDom(list) {
    const container = document.getElementById('lists-container');
    const div = document.createElement('div');
    div.id = `list-${list.id}`;
    div.innerHTML = `<h3>${list.name}</h3>
    <input type="text" placeholder="Add name">
    <button onclick="addName(${list.id}, document.querySelector('#list-${list.id} input').value)">Add</button>
    <ul></ul>`;
    container.appendChild(div);
    fetchNames(list.id); // Fetch names for the list
}

function addName(listId, name) {
    fetch(`/api/lists/${listId}/names`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    })
        .then(response => response.json())
        .then(name => {
            const ul = document.querySelector(`#list-${listId} ul`);
            const li = document.createElement('li');
            li.id = `name-${name.id}`;
            li.innerHTML = `${name.name} <button onclick="removeName(${listId}, '${name.id}')">Remove</button>`;
            ul.appendChild(li);
            // Clear the input field after adding the name
            document.querySelector(`#list-${listId} input`).value = '';
        });
}

function fetchNames(listId) {
    fetch(`/api/lists/${listId}/names`)
        .then(response => response.json())
        .then(names => {
            const ul = document.querySelector(`#list-${listId} ul`);
            ul.innerHTML = ''; // Clear existing names
            names.forEach(name => {
                const li = document.createElement('li');
                li.id = `name-${name.id}`;
                li.innerHTML = `${name.name} <button onclick="removeName(${listId}, '${name.id}')">Remove</button>`;
                ul.appendChild(li);
            });
        });
}

function removeName(listId, nameId) {
    fetch(`/api/lists/${listId}/names/${nameId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(() => {
            const nameElement = document.getElementById(`name-${nameId}`);
            nameElement.parentNode.removeChild(nameElement);
        });
}

fetch('/api/lists')
    .then(response => response.json())
    .then(lists => {
        lists.forEach(addListToDom);
    });
