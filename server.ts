import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // Default state
  let globalState: any = {
    users: null,
    requests: null,
    invoices: null,
    cwInflow: null,
    archivedInflow: null,
    debtors: null,
    creditors: null,
    projects: null,
    services: null,
    parts: null,
    boardSessions: null,
    hiddenFunds: null,
    dispatchedDirectives: null,
    bankAccounts: null,
    revenueCategories: null,
    annualBudgets: null,
    currentYearActuals: null,
    budgetAnalysisComments: null,
    mockRates: null,
    mockInflation: null
  };

  // Load state from file if it exists
  if (fs.existsSync(DATA_FILE)) {
    try {
      const savedData = fs.readFileSync(DATA_FILE, 'utf-8');
      globalState = { ...globalState, ...JSON.parse(savedData) };
      console.log('Loaded state from data.json');
    } catch (err) {
      console.error('Error reading data.json:', err);
    }
  }

  const saveState = () => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(globalState, null, 2));
    } catch (err) {
      console.error('Error writing to data.json:', err);
    }
  };

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current state to new client
    socket.emit('init_state', globalState);

    socket.on('update_state', (data) => {
      // Update specific part of state
      const { key, action, id, changes, value, userRole } = data;
      
      // Basic role verification (prevent unauthorized state changes)
      const isAllowed = userRole && ["FOUNDER", "CEO", "FIN_DIRECTOR"].includes(userRole);
      if (!isAllowed) {
        console.warn(`Unauthorized update attempt by role: ${userRole}`);
        socket.emit('auth_error', { message: 'Insufficient permissions.' });
        return;
      }

      if (globalState.hasOwnProperty(key)) {
        if (action === 'update_item' && Array.isArray(globalState[key])) {
          const index = globalState[key].findIndex((item: any) => item.id === id);
          if (index !== -1) {
            globalState[key][index] = { ...globalState[key][index], ...changes };
          }
        } else if (action === 'add_item' && Array.isArray(globalState[key])) {
          globalState[key].push(value);
        } else if (action === 'delete_item' && Array.isArray(globalState[key])) {
          globalState[key] = globalState[key].filter((item: any) => item.id !== id);
        } else {
          // Fallback to full replacement
          globalState[key] = value;
        }

        saveState(); // Persist to file
        // Broadcast to all other clients
        socket.broadcast.emit('state_updated', data);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      configFile: './vite.config.ts',
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
