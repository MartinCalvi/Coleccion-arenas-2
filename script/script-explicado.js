// --- CONSTANTES GLOBALES ---
// Seleccionamos los elementos del HTML por su ID para poder manipularlos
const formularioMuestra = document.getElementById('formularioMuestra');
const tablaBody = document.querySelector('#tabla-muestras tbody'); // El cuerpo donde irán las filas
const tablaMuestras = document.getElementById('tabla-muestras'); // La tabla completa
const mensajeVacio = document.getElementById('mensaje-vacio'); // Letrero de "No hay muestras"
const botonLimpiar = document.getElementById('limpiarDatos'); // Botón para borrar todo
const botonExportar = document.getElementById('exportarDatos'); // Botón para bajar el CSV
const KEY_STORAGE = 'muestrasGeologicas'; // Nombre de la "llave" para guardar en el navegador

// Elementos para la búsqueda manual en el mapa
const formularioMapaManual = document.getElementById('formularioMapaManual');
const inputMapLatitud = document.getElementById('mapLatitud');
const inputMapLongitud = document.getElementById('mapLongitud');

// --- FUNCIONES DE UTILIDAD Y MAPA ---

/**
 * Crea un enlace a Google Maps usando coordenadas o ubicación de texto
 */
function abrirEnGoogleMaps(latitud, longitud, localidad, pais) {
    let url = ''; // Variable donde armaremos la dirección web
    
    // Función interna para limpiar las coordenadas de símbolos extraños
    function convertirADecimal(coord) {
        if (!coord) return null; // Si no hay dato, devuelve nulo
        let decimal = parseFloat(coord.toString().replace(/[^\d.\-]/g, '')); // Quita todo lo que no sea número o punto
        return isNaN(decimal) ? null : decimal; // Si no es un número válido, devuelve nulo
    }

    const latDecimal = convertirADecimal(latitud);
    const lonDecimal = convertirADecimal(longitud);

    // Si tenemos coordenadas numéricas, tienen prioridad
    if (latDecimal !== null && lonDecimal !== null) {
        url = `https://www.google.com/maps?q=${latDecimal},${lonDecimal}`;
    } 
    // Si no hay coordenadas pero hay ciudad o país, busca por texto
    else if (localidad || pais) {
        const consulta = encodeURIComponent(`${localidad}${localidad && pais ? ', ' : ''}${pais}`);
        url = `https://www.google.com/maps/search/${consulta}`;
    } 
    // Si no hay nada, avisa al usuario
    else {
        alert("No hay datos suficientes para ubicar en el mapa.");
        return;
    }

    window.open(url, '_blank'); // Abre el mapa en una pestaña nueva
}

/**
 * Maneja el formulario pequeño que solo pide Lat/Lon para ver el mapa
 */
function manejarEnvioMapaManual(e) {
    e.preventDefault(); // Evita que la página se recargue
    abrirEnGoogleMaps(inputMapLatitud.value, inputMapLongitud.value, '', ''); 
}

// --- GESTIÓN DE ALMACENAMIENTO (LocalStorage) ---

// Lee los datos guardados en el navegador y los convierte de texto a objeto JS
function obtenerMuestras() {
    const muestrasJSON = localStorage.getItem(KEY_STORAGE);
    return muestrasJSON ? JSON.parse(muestrasJSON) : [];
}

// Convierte los objetos a texto y los guarda permanentemente en el navegador
function guardarMuestras(muestras) {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(muestras));
}

// Borra una muestra específica buscando su ID único
function eliminarMuestra(id) {
    if (!confirm('¿Eliminar esta muestra?')) return; // Pide confirmación
    let muestras = obtenerMuestras(); // Trae la lista actual
    muestras = muestras.filter(m => m.id !== id); // Filtra la lista quitando la que tiene ese ID
    guardarMuestras(muestras); // Guarda la nueva lista sin el elemento borrado
    renderizarMuestras(); // Actualiza la tabla visualmente
}

// --- RENDERIZADO (Dibujar la tabla) ---

/**
 * Transforma las celdas de texto en cuadros editables (input/textarea)
 */
function habilitarEdicion(id, fila) {
    const celdas = fila.getElementsByTagName('td'); // Obtiene todas las columnas de la fila actual
    const campos = ['numeroMuestra', 'coleccionista', 'localidad', 'pais', 'mineralogia', 'paleontologia', 'latitud', 'longitud'];
    
    campos.forEach((campo, index) => {
        const valorActual = celdas[index].textContent === "---" ? "" : celdas[index].textContent;
        
        // Si es un campo de mucho texto, ponemos un textarea, si no, un input normal
        if (campo === 'mineralogia' || campo === 'paleontologia') {
            celdas[index].innerHTML = `<textarea rows="3" class="input-edicion" id="edit-${campo}-${id}">${valorActual}</textarea>`;
        } else {
            celdas[index].innerHTML = `<input type="text" value="${valorActual}" class="input-edicion" id="edit-${campo}-${id}">`;
        }
    });

    const celdaAcciones = celdas[campos.length + 1]; // Selecciona la última celda (Acciones)
    celdaAcciones.innerHTML = ''; // Borra los botones de "Editar/Eliminar"
    
    const botonGuardar = document.createElement('button'); // Crea el botón de "Guardar" cambios
    botonGuardar.textContent = 'Guardar';
    botonGuardar.classList.add('btn-accion', 'btn-guardar-edicion');
    botonGuardar.onclick = () => guardarEdicion(id); // Al hacer clic, ejecuta la función de guardado
    celdaAcciones.appendChild(botonGuardar);
}

/**
 * Toma los valores de los cuadros editables y los guarda
 */
function guardarEdicion(id) {
    const nuevosDatos = {
        numeroMuestra: document.getElementById(`edit-numeroMuestra-${id}`).value,
        coleccionista: document.getElementById(`edit-coleccionista-${id}`).value,
        localidad: document.getElementById(`edit-localidad-${id}`).value,
        pais: document.getElementById(`edit-pais-${id}`).value,
        mineralogia: document.getElementById(`edit-mineralogia-${id}`).value,
        paleontologia: document.getElementById(`edit-paleontologia-${id}`).value,
        latitud: document.getElementById(`edit-latitud-${id}`).value, 
        longitud: document.getElementById(`edit-longitud-${id}`).value
    };

    // Validación: o pones ambas coordenadas o ninguna
    if ((nuevosDatos.latitud && !nuevosDatos.longitud) || (!nuevosDatos.latitud && nuevosDatos.longitud)) {
        alert('Si ingresas una coordenada, debes completar ambos campos.');
        return;
    }

    let muestras = obtenerMuestras(); // Trae los datos
    const indice = muestras.findIndex(m => m.id === id); // Busca en qué posición de la lista está el ID
    if (indice !== -1) muestras[indice] = { ...muestras[indice], ...nuevosDatos }; // Reemplaza los datos viejos con los nuevos

    guardarMuestras(muestras); // Guarda en LocalStorage
    renderizarMuestras(); // Refresca la tabla
}

/**
 * Función principal que dibuja toda la tabla en pantalla
 */
function renderizarMuestras() {
    const muestras = obtenerMuestras(); // Obtiene los datos
    tablaBody.innerHTML = ''; // Limpia la tabla por completo antes de dibujar

    const hayDatos = muestras.length > 0;
    mensajeVacio.classList.toggle('oculto', hayDatos); // Si hay datos, esconde el mensaje de "vacío"
    tablaMuestras.classList.toggle('oculto', !hayDatos); // Si no hay datos, esconde la tabla

    muestras.forEach(m => {
        const fila = tablaBody.insertRow(); // Crea una nueva fila <tr>
        const dato = (val) => (val && val.trim() !== "") ? val : "---"; // Función para poner rayas si no hay dato

        // Insertamos celdas con la información
        fila.insertCell().textContent = dato(m.numeroMuestra);
        fila.insertCell().textContent = dato(m.coleccionista);
        fila.insertCell().textContent = dato(m.localidad);
        fila.insertCell().textContent = dato(m.pais);
        fila.insertCell().textContent = dato(m.mineralogia);
        fila.insertCell().textContent = dato(m.paleontologia);
        fila.insertCell().textContent = dato(m.latitud);
        fila.insertCell().textContent = dato(m.longitud);

        // Botón de Mapa
        const celdaMapa = fila.insertCell();
        const btnMap = document.createElement('button');
        btnMap.textContent = 'Ver en Mapa';
        btnMap.className = 'btn-accion btn-mapa';
        btnMap.onclick = () => abrirEnGoogleMaps(m.latitud, m.longitud, m.localidad, m.pais);
        celdaMapa.appendChild(btnMap);
        
        // Botones de Acción (Editar/Eliminar)
        const celdaAcc = fila.insertCell();
        celdaAcc.innerHTML = `
            <button class="btn-accion btn-editar" onclick="habilitarEdicion('${m.id}', this.parentElement.parentElement)">Editar</button>
            <button class="btn-accion btn-eliminar" onclick="eliminarMuestra('${m.id}')">Eliminar</button>
        `;
    });
}

// --- EVENTOS PRINCIPALES ---

/**
 * Cuando el usuario hace clic en "Guardar Muestra" en el formulario principal
 */
formularioMuestra.addEventListener('submit', (e) => {
    e.preventDefault(); // Detiene el envío real del formulario

    const nuevaMuestra = {
        id: Date.now().toString(), // Genera un ID basado en el tiempo actual
        numeroMuestra: document.getElementById('numeroMuestra').value,
        coleccionista: document.getElementById('coleccionista').value,
        localidad: document.getElementById('localidad').value,
        pais: document.getElementById('pais').value,
        mineralogia: document.getElementById('mineralogia').value,
        paleontologia: document.getElementById('paleontologia').value,
        latitud: document.getElementById('latitud').value, 
        longitud: document.getElementById('longitud').value
    };

    if ((nuevaMuestra.latitud && !nuevaMuestra.longitud) || (!nuevaMuestra.latitud && nuevaMuestra.longitud)) {
        return alert('Complete ambos campos de coordenadas.');
    }

    const lista = obtenerMuestras(); // Trae lista actual
    lista.push(nuevaMuestra); // Agrega la nueva
    guardarMuestras(lista); // Guarda todo
    renderizarMuestras(); // Dibuja la tabla
    formularioMuestra.reset(); // Limpia los cuadritos del formulario
});

/**
 * Exporta los datos a un archivo Excel/CSV
 */
botonExportar.addEventListener('click', () => {
    const datos = obtenerMuestras();
    if (datos.length === 0) return;

    const cabeceras = "ID,Numero,Coleccionista,Localidad,Pais,Mineralogia,Paleontologia,Lat,Lon\n";
    const filas = datos.map(m => `"${m.id}","${m.numeroMuestra}","${m.coleccionista}","${m.localidad}","${m.pais}","${m.mineralogia}","${m.paleontologia}","${m.latitud}","${m.longitud}"`).join("\n");

    const blob = new Blob([cabeceras + filas], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registro_geologico.csv';
    a.click(); // Dispara la descarga del archivo
});

// Botón para borrar absolutamente todo de la memoria
botonLimpiar.addEventListener('click', () => {
    if (confirm('¿Borrar TODO el registro?')) {
        localStorage.removeItem(KEY_STORAGE);
        renderizarMuestras();
    }
});

// Evento para el buscador manual de coordenadas
if(formularioMapaManual) formularioMapaManual.addEventListener('submit', manejarEnvioMapaManual);

// Iniciar la tabla apenas cargue la página
document.addEventListener('DOMContentLoaded', renderizarMuestras);