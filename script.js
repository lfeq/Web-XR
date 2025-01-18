// 1) NO iniciamos la cámara inmediatamente (esperamos al overlay)
const closeBtn = document.getElementById('close-btn');
closeBtn.addEventListener('click', closeIntro);

// Generamos posición aleatoria (en %)
placeObjectsRandomly();

function closeIntro() {
  // Ocultamos el overlay
  document.getElementById('intro-overlay').style.display = 'none';
  // Iniciamos la cámara y habilitamos el juego
  startCamera();
  enableGameUI();
}

/*******************************************
 * startCamera: getUserMedia
 ********************************************/
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById('camera-stream');
    video.srcObject = stream;
  } catch (err) {
    console.error("No se pudo acceder a la cámara:", err);
    alert("No se pudo acceder a la cámara. Revisa permisos o usa otro dispositivo.");
  }
}

/*******************************************
 * Habilitar la interacción con el juego
 ********************************************/
function enableGameUI() {
  document.getElementById('camera-container').style.pointerEvents = 'auto';
  document.getElementById('game-container').style.pointerEvents = 'auto';
  initDragAndDrop();
}

/*******************************************
 * Posicionar objetos aleatoriamente en %
 ********************************************/
function placeObjectsRandomly() {
  // 1. Obtenemos la posición de la barra inferior
  const bar = document.getElementById('bottom-bar-container');
  const barRect = bar.getBoundingClientRect();
  
  // 2. Calculamos límite inferior (top de la barra)
  const limitBottom = barRect.top;
  
  // 3. Seleccionamos draggables
  const draggables = document.querySelectorAll('.draggable');
  
  draggables.forEach(el => {
    // Calculamos la posición random en px
    const randomTopPx = Math.random() * Math.max(0, limitBottom - 100); 
    // “100” es un margen de seguridad
    const randomLeftPx = Math.random() * (window.innerWidth - 100);

    // Convertimos a %
    const topPct  = (randomTopPx / window.innerHeight) * 100;
    const leftPct = (randomLeftPx / window.innerWidth) * 100;

    // Asignamos
    el.style.top  = topPct + '%';
    el.style.left = leftPct + '%';

    // Guardamos la posición inicial (en %)
    el.dataset.initialLeft = el.style.left;
    el.dataset.initialTop  = el.style.top;
  });
}

/*******************************************
 * Lógica de Drag & Drop
 ********************************************/
function initDragAndDrop() {
  let draggedElement = null;
  let offsetX = 0;
  let offsetY = 0;

  const draggables = document.querySelectorAll('.draggable');
  const dropzones = document.querySelectorAll('.dropzone');

  // Prevenir drag nativo
  document.addEventListener('dragstart', e => e.preventDefault());

  draggables.forEach(el => {
    el.addEventListener('mousedown', dragStart);
    el.addEventListener('touchstart', dragStartTouch, { passive: false });
  });

  function dragStart(e) {
    e.preventDefault();
    draggedElement = e.currentTarget;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    draggedElement.style.cursor = 'grabbing';

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
  }

  function dragMove(e) {
    if (!draggedElement) return;
    e.preventDefault();

    const x = e.pageX - offsetX;
    const y = e.pageY - offsetY;

    const leftPct = (x / window.innerWidth)  * 100;
    const topPct  = (y / window.innerHeight) * 100;

    draggedElement.style.left = leftPct + '%';
    draggedElement.style.top  = topPct + '%';
  }

  function dragEnd(e) {
    if (!draggedElement) return;
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);

    checkDropZone(e.pageX, e.pageY);
    draggedElement.style.cursor = 'grab';
    draggedElement = null;
  }

  // Soporte Touch
  function dragStartTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    draggedElement = e.currentTarget;
    const rect = draggedElement.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;

    document.addEventListener('touchmove', dragMoveTouch, { passive: false });
    document.addEventListener('touchend', dragEndTouch);
  }

  function dragMoveTouch(e) {
    if (!draggedElement) return;
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX - offsetX;
    const y = touch.clientY - offsetY;

    const leftPct = (x / window.innerWidth)  * 100;
    const topPct  = (y / window.innerHeight) * 100;

    draggedElement.style.left = leftPct + '%';
    draggedElement.style.top  = topPct + '%';
  }

  function dragEndTouch(e) {
    if (!draggedElement) return;
    e.preventDefault();
    document.removeEventListener('touchmove', dragMoveTouch);
    document.removeEventListener('touchend', dragEndTouch);

    const touch = e.changedTouches[0];
    checkDropZone(touch.clientX, touch.clientY);
    draggedElement = null;
  }

  // Revisa si cayó en la dropzone
  function checkDropZone(x, y) {
    if (!draggedElement) return;

    let foundZone = null;
    for (const dz of dropzones) {
      const rect = dz.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        foundZone = dz;
        break;
      }
    }

    if (foundZone) {
      // Verificamos si coincide con data-target
      if (draggedElement.dataset.target === foundZone.id) {
        foundZone.classList.add('correct');
        foundZone.classList.remove('wrong');
        
        placeInCenter(draggedElement, foundZone);
        lockDraggable(draggedElement);
        showCorrectFeedback(draggedElement.id);
      } else {
        foundZone.classList.add('wrong');
        foundZone.classList.remove('correct');
        revertPosition(draggedElement);
      }
    } else {
      // No cayó en ninguna zona
      revertPosition(draggedElement);
    }
  }

  // Centra el objeto en la zona
  function placeInCenter(element, zone) {
    const dzRect = zone.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();

    const centerX = dzRect.left + dzRect.width / 2;
    const centerY = dzRect.top + dzRect.height / 2;

    const finalX = centerX - elRect.width / 2;
    const finalY = centerY - elRect.height / 2;

    const leftPct = (finalX / window.innerWidth)  * 100;
    const topPct  = (finalY / window.innerHeight) * 100;

    element.style.left = leftPct + '%';
    element.style.top  = topPct + '%';
  }

  function lockDraggable(element) {
    element.style.pointerEvents = 'none';
    element.style.cursor = 'default';
  }

  function revertPosition(element) {
    element.style.left = element.dataset.initialLeft;
    element.style.top  = element.dataset.initialTop;
  }

  // Mostrar palomita / mensaje
  function showCorrectFeedback(itemId) {
    // Palomita
    const checkImg = document.getElementById(`check-${itemId}`);
    if (checkImg) {
      checkImg.style.display = 'inline';
    }

    // Mensaje (se oculta luego de 5s)
    const msg = document.getElementById(`message-${itemId}`);
    if (msg) {
      msg.style.display = 'inline';
      setTimeout(() => {
        msg.style.display = 'none';
      }, 5000);
    }

    // Texto (en este caso no se oculta)
    const text = document.getElementById(`text-${itemId}`);
    if (text) {
      text.style.display = 'inline';
    }
  }
}
