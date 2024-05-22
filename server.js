const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const db = new sqlite3.Database('./db.sqlite');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// Initialize DB
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER,
    name TEXT,
    drawn BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (list_id) REFERENCES lists(id)
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS cookies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cookie TEXT
  )`);
});

// Route to generate and give admin cookie
app.get('/give-cookie', (req, res) => {
    const adminCookie = uuidv4();
    db.run(`INSERT INTO cookies (cookie) VALUES (?)`, [adminCookie], function(err) {
        if (err) {
            return res.status(500).send('Failed to generate admin cookie');
        }
        res.cookie('admin', adminCookie, { maxAge: 9000000000 });
        res.sendFile(path.join(__dirname, 'public', 'give-cookie.html'));
    });
});

// Middleware to check admin cookie
const checkAdminCookie = (req, res, next) => {
    const adminCookie = req.cookies.admin;
    if (!adminCookie) {
        return res.status(403).send('Admin cookie is missing');
    }
    db.get(`SELECT * FROM cookies WHERE cookie = ?`, [adminCookie], (err, row) => {
        if (err || !row) {
            return res.status(403).send('Invalid admin cookie');
        }
        next();
    });
};

// Admin page
app.get('/admin', checkAdminCookie, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Button page
app.get('/button', checkAdminCookie, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'button.html'));
});

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('New client connected');

    // Emit list of names to roll
    socket.on('startRoll', (listId) => {
        db.all('SELECT name FROM names WHERE list_id = ? AND drawn = 0', [listId], (err, rows) => {
            if (err) {
                console.error('Error fetching names:', err);
                return;
            }

            if (rows.length === 0) {
                console.log('No available names to roll');
                return;
            }

            // Randomly select a name
            const selectedName = rows[Math.floor(Math.random() * rows.length)].name;

            // Update the selected name's 'drawn' field to 1
            db.run('UPDATE names SET drawn = 1 WHERE list_id = ? AND name = ?', [listId, selectedName], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating name:', updateErr);
                    return;
                }

                console.log('Name rolled:', selectedName);

                // Emit the selected name to all clients
                io.emit('nameRolled', selectedName);
            });
        });
    });

    // Stop the rolling
    socket.on('stopRoll', () => {
        io.emit('stop');
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Handle the /button endpoint
app.post('/button', (req, res) => {
    const { listId } = req.body;
    if (!listId) {
        return res.status(400).json({ error: 'listId is required' });
    }

    // Emit startRoll event with the listId
    io.emit('startRoll', listId);
    res.sendStatus(200);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// API routes

// Get all lists
app.get('/api/lists', (req, res) => {
    db.all(`SELECT * FROM lists`, [], (err, rows) => {
        if (err) {
            return res.status(500).send('Failed to fetch lists');
        }
        res.json(rows);
    });
});

// Create a new list
app.post('/api/lists', checkAdminCookie, (req, res) => {
    const { name } = req.body;
    db.run(`INSERT INTO lists (name) VALUES (?)`, [name], function(err) {
        if (err) {
            return res.status(500).send('Failed to create list');
        }
        res.json({ id: this.lastID, name });
    });
});
// Reset the 'drawn' field for all names in the specified list
app.post('/api/lists/:listId/reset', (req, res) => {
    const { listId } = req.params;

    db.run('UPDATE names SET drawn = 0 WHERE list_id = ?', [listId], (err) => {
        if (err) {
            console.error('Error resetting drawn field:', err);
            res.status(500).json({ error: 'Error resetting drawn field' });
            return;
        }
        console.log('Drawn field reset for list:', listId);
        res.sendStatus(200);
    });
});

// Add a name to a list
app.post('/api/lists/:listId/names', checkAdminCookie, (req, res) => {
    const { listId } = req.params;
    const { name } = req.body;
    db.run(`INSERT INTO names (list_id, name) VALUES (?, ?)`, [listId, name], function(err) {
        if (err) {
            return res.status(500).send('Failed to add name');
        }
        res.json({ id: this.lastID, name });
    });
});

// Get names of a list
app.get('/api/lists/:listId/names', (req, res) => {
    const { listId } = req.params;
    db.all(`SELECT * FROM names WHERE list_id = ?`, [listId], (err, rows) => {
        if (err) {
            return res.status(500).send('Failed to fetch names');
        }
        res.json(rows);
    });
});

// Delete a name from a list
app.delete('/api/lists/:listId/names/:nameId', checkAdminCookie, (req, res) => {
    const { listId, nameId } = req.params;
    db.run('DELETE FROM names WHERE id = ? AND list_id = ?', [nameId, listId], (err) => {
        if (err) {
            return res.status(500).send('Failed to delete name');
        }
        res.sendStatus(200);
    });
});

// Delete a list
app.delete('/api/lists/:listId', checkAdminCookie, (req, res) => {
    const { listId } = req.params;
    db.run('DELETE FROM lists WHERE id = ?', [listId], (err) => {
        if (err) {
            return res.status(500).send('Failed to delete list');
        }
        res.sendStatus(200);
    });
});
