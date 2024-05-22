document.addEventListener('DOMContentLoaded', () => {
    const rollButton = document.getElementById('roll-button');
    const resetButton = document.getElementById('reset-button');
    const listSelect = document.getElementById('list-select');

    // Establish WebSocket connection
    const socket = io();

    // Fetch and populate the list options
    fetch('/api/lists')
        .then(response => response.json())
        .then(lists => {
            lists.forEach(list => {
                const option = document.createElement('option');
                option.value = list.id;
                option.textContent = list.name;
                listSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching lists:', error);
        });

    rollButton.addEventListener('click', () => {
        const listId = listSelect.value;
        if (!listId) {
            alert('Please select a list');
            return;
        }

        // Emit startRoll event with the selected listId
        socket.emit('startRoll', listId);
    });

    resetButton.addEventListener('click', () => {
        const listId = listSelect.value;
        if (!listId) {
            alert('Please select a list');
            return;
        }

        fetch(`/api/lists/${listId}/reset`, {
            method: 'POST'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to reset list');
                }
                console.log('List reset successfully');
            })
            .catch(error => {
                console.error('Error resetting list:', error);
                alert('Failed to reset list');
            });
    });
});
