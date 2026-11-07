
const API = '/api';

const $ = (id) => document.getElementById(id);

let boletos = [];
let viajes = [];

function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function mostrarMensaje(id, mensaje, tipo) {
    const elemento = $(id);
    elemento.textContent = mensaje;
    elemento.className = `message ${tipo}`;

    setTimeout(() => {
        elemento.className = 'message';
    }, 5000);
}

async function cargarViajes() {
    try {
        const respuesta = await fetch(`${API}/viajes`);
        if (!respuesta.ok) throw new Error('No se pudieron cargar los viajes');

        viajes = await respuesta.json();

        $('viaje_id').innerHTML = '<option value="">Selecciona un viaje</option>';

        viajes.forEach(viaje => {
            const opcion = document.createElement('option');
            opcion.value = viaje.id;
            opcion.textContent =
                `${viaje.origen} → ${viaje.destino} | ${viaje.fecha_salida} | S/ ${Number(viaje.precio).toFixed(2)}`;
            $('viaje_id').appendChild(opcion);
        });

        $('totalViajes').textContent = viajes.length;
    } catch (error) {
        console.error(error);
    }
}

async function cargarBoletos() {
    try {
        const respuesta = await fetch(`${API}/boletos`);
        if (!respuesta.ok) throw new Error('Error al consultar boletos');

        boletos = await respuesta.json();

        actualizarTabla();
        actualizarEstadisticas();

    } catch (error) {
        console.error(error);
        $('tablaBoletos').innerHTML =
            '<tr><td colspan="8" class="empty-state">No se pudieron cargar los boletos.</td></tr>';
    }
}

function actualizarEstadisticas() {
    const pasajerosUnicos = new Set(boletos.map(b => b.dni));

    const ingresos = boletos
        .filter(b => b.estado === 'pagado')
        .reduce((total, b) => total + Number(b.precio), 0);

    $('totalBoletos').textContent = boletos.length;
    $('totalPasajeros').textContent = pasajerosUnicos.size;
    $('totalIngresos').textContent = `S/ ${ingresos.toFixed(2)}`;
    $('totalViajes').textContent = viajes.length;
}

function actualizarTabla() {
    const busqueda = $('buscarBoleto').value.toLowerCase().trim();

    const filtrados = boletos.filter(boleto => {
        const texto = [
            boleto.codigo,
            boleto.dni,
            boleto.nombres,
            boleto.apellidos,
            boleto.origen,
            boleto.destino
        ].join(' ').toLowerCase();

        return texto.includes(busqueda);
    });

    if (!filtrados.length) {
        $('tablaBoletos').innerHTML =
            '<tr><td colspan="8" class="empty-state">No hay boletos para mostrar.</td></tr>';
        return;
    }

    $('tablaBoletos').innerHTML = filtrados.map(b => `
        <tr>
            <td><strong>${escapar(b.codigo)}</strong></td>
            <td>${escapar(b.nombres)} ${escapar(b.apellidos)}</td>
            <td>${escapar(b.origen)} → ${escapar(b.destino)}</td>
            <td>${escapar(b.fecha_salida)}</td>
            <td>${escapar(b.numero_asiento)}</td>
            <td>S/ ${Number(b.precio).toFixed(2)}</td>
            <td><span class="status ${escapar(b.estado)}">${escapar(b.estado)}</span></td>
            <td>
                <button class="delete-btn" data-id="${Number(b.id)}" title="Eliminar boleto">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

$('formViaje').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const datos = {
        origen: $('origen').value.trim(),
        destino: $('destino').value.trim(),
        fecha_salida: $('fecha_salida').value,
        hora_salida: $('hora_salida').value,
        precio: Number($('precio').value),
        bus: $('bus').value.trim()
    };

    try {
        const respuesta = await fetch(`${API}/viajes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) throw new Error(resultado.mensaje);

        mostrarMensaje('mensajeViaje', resultado.mensaje, 'success');
        $('formViaje').reset();

        await cargarViajes();
        actualizarEstadisticas();

    } catch (error) {
        mostrarMensaje('mensajeViaje', error.message, 'error');
    }
});

$('formBoleto').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const datos = {
        dni: $('dni').value.trim(),
        nombres: $('nombres').value.trim(),
        apellidos: $('apellidos').value.trim(),
        telefono: $('telefono').value.trim(),
        viaje_id: Number($('viaje_id').value),
        numero_asiento: Number($('asiento').value)
    };

    try {
        const respuesta = await fetch(`${API}/boletos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) throw new Error(resultado.mensaje);

        mostrarMensaje(
            'mensajeFormulario',
            `${resultado.mensaje}. Código: ${resultado.codigo}`,
            'success'
        );

        $('formBoleto').reset();

        await cargarBoletos();

    } catch (error) {
        mostrarMensaje('mensajeFormulario', error.message, 'error');
    }
});

$('tablaBoletos').addEventListener('click', async (evento) => {
    const boton = evento.target.closest('.delete-btn');
    if (!boton) return;

    const id = boton.dataset.id;

    if (!confirm('¿Estás seguro de eliminar este boleto?')) return;

    try {
        const respuesta = await fetch(`${API}/boletos/${id}`, {
            method: 'DELETE'
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) throw new Error(resultado.mensaje);

        alert(resultado.mensaje);
        await cargarBoletos();

    } catch (error) {
        alert(error.message);
    }
});

$('buscarBoleto').addEventListener('input', actualizarTabla);

$('btnActualizar').addEventListener('click', async () => {
    await cargarViajes();
    await cargarBoletos();
});

$('menuToggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach(enlace => {
    enlace.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(item => {
            item.classList.remove('active');
        });

        enlace.classList.add('active');
        $('sidebar').classList.remove('open');
    });
});

async function iniciarSistema() {
    await cargarViajes();
    await cargarBoletos();
    actualizarEstadisticas();
}

iniciarSistema();
