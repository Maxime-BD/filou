document.addEventListener('DOMContentLoaded', () => {
    const nameDisplay = document.getElementById('name-display');
    const rollButton = document.getElementById('roll-button');
    const stopButton = document.getElementById('stop-button');

    // Establish WebSocket connection
    const socket = io();

    // Listen for the 'nameRolled' event from the server
    socket.on('nameRolled', (selectedName) => {
        // Display the selected name
        nameDisplay.textContent = selectedName;
    });

    rollButton.addEventListener('click', () => {
        // Emit the 'startRoll' event to the server when the roll button is clicked
        socket.emit('startRoll');
    });

    stopButton.addEventListener('click', () => {
        // Emit the 'stopRoll' event to the server when the stop button is clicked
        socket.emit('stopRoll');
    });
});
