
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./models/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Comprobar servidor y base de datos
app.get('/api/salud', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ estado: 'OK', baseDeDatos: 'Conectada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error de conexión' });
    }
});

// Listar viajes
app.get('/api/viajes', async (req, res) => {
    try {
        const [viajes] = await db.query(
            'SELECT * FROM viajes ORDER BY fecha_salida, hora_salida'
        );
        res.json(viajes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al consultar viajes' });
    }
});

// Registrar un viaje
app.post('/api/viajes', async (req, res) => {
    try {
        const { origen, destino, fecha_salida, hora_salida, precio, bus } = req.body;

        if (!origen || !destino || !fecha_salida || !hora_salida || precio == null) {
            return res.status(400).json({ mensaje: 'Completa los datos del viaje' });
        }

        const [result] = await db.query(
            `INSERT INTO viajes
            (origen, destino, fecha_salida, hora_salida, precio, bus)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [origen, destino, fecha_salida, hora_salida, precio, bus || null]
        );

        res.status(201).json({
            mensaje: 'Viaje registrado correctamente',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'No se pudo registrar el viaje' });
    }
});

// Listar boletos
app.get('/api/boletos', async (req, res) => {
    try {
        const [boletos] = await db.query(`
            SELECT b.id, b.codigo, b.numero_asiento, b.estado,
                   b.fecha_compra,
                   p.dni, p.nombres, p.apellidos, p.telefono,
                   v.origen, v.destino, v.fecha_salida,
                   v.hora_salida, v.precio, v.bus
            FROM boletos b
            INNER JOIN pasajeros p ON b.pasajero_id = p.id
            INNER JOIN viajes v ON b.viaje_id = v.id
            ORDER BY b.id DESC
        `);

        res.json(boletos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al consultar boletos' });
    }
});

// Registrar boleto y pasajero
app.post('/api/boletos', async (req, res) => {
    try {
        const {
            dni, nombres, apellidos, telefono,
            viaje_id, numero_asiento
        } = req.body;

        if (!dni || !nombres || !apellidos || !viaje_id || !numero_asiento) {
            return res.status(400).json({
                mensaje: 'Completa todos los campos obligatorios'
            });
        }

        const [viajes] = await db.query(
            'SELECT id FROM viajes WHERE id = ?',
            [viaje_id]
        );

        if (!viajes.length) {
            return res.status(404).json({ mensaje: 'El viaje no existe' });
        }

        let [pasajeros] = await db.query(
            'SELECT id FROM pasajeros WHERE dni = ?',
            [dni]
        );

        let pasajeroId;

        if (pasajeros.length) {
            pasajeroId = pasajeros[0].id;
            await db.query(
                'UPDATE pasajeros SET nombres = ?, apellidos = ?, telefono = ? WHERE id = ?',
                [nombres, apellidos, telefono || null, pasajeroId]
            );
        } else {
            const [nuevo] = await db.query(
                `INSERT INTO pasajeros (dni, nombres, apellidos, telefono)
                 VALUES (?, ?, ?, ?)`,
                [dni, nombres, apellidos, telefono || null]
            );
            pasajeroId = nuevo.insertId;
        }

        const codigo = 'BOL-' + Date.now();

        const [boleto] = await db.query(
            `INSERT INTO boletos
             (codigo, pasajero_id, viaje_id, numero_asiento)
             VALUES (?, ?, ?, ?)`,
            [codigo, pasajeroId, viaje_id, numero_asiento]
        );

        res.status(201).json({
            mensaje: 'Boleto registrado correctamente',
            codigo,
            id: boleto.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                mensaje: 'Ese asiento ya está ocupado para este viaje'
            });
        }

        res.status(500).json({ mensaje: 'Error al registrar el boleto' });
    }
});

// Eliminar boleto
app.delete('/api/boletos/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM boletos WHERE id = ?',
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ mensaje: 'Boleto no encontrado' });
        }

        res.json({ mensaje: 'Boleto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar boleto' });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Sistema funcionando en http://localhost:${PORT}`);
});
