// ====== Ajustes de imagen ======
const CARD_ASPECT = '4 / 3'; // cámbialo a '1 / 1' (cuadrado) o '3 / 2' si lo prefieres

// Convierte enlaces de Drive compartidos al formato que sirve en páginas estáticas
function resolveImageURL(url) {
  const m = /\/d\/([^/]+)/.exec(url);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

// ====== Estado global ======
let allPerfumes = [];
let currentPage = 1;
const pageSize = 12;

// ====== Selectores ======
const container = document.getElementById('perfume-container');
const skeleton = document.getElementById('skeleton');
const q = document.getElementById('q');
const min = document.getElementById('min');
const max = document.getElementById('max');
const sort = document.getElementById('sort');
const pagination = document.getElementById('pagination');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const pageInfo = document.getElementById('page-info');

// ====== Modal ======
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalImg = document.getElementById('modal-img');
const modalBrand = document.getElementById('modal-brand');
const modalDesc = document.getElementById('modal-desc');
const modalPrice = document.getElementById('modal-price');
const modalAdd = document.getElementById('modal-add');

// ====== Carrito ======
const CART_KEY = 'perfume_cart';
const cartBtn = document.getElementById('cart-btn');
const cartCount = document.getElementById('cart-count');

// Formateador de moneda (EUR por defecto)
const fmtPrice = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

// ====== Utilidades carrito ======
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
function updateCartCount() { cartCount.textContent = getCart().reduce((acc, it) => acc + (it.qty || 1), 0); }
function addToCart(id) {
  const cart = getCart();
  const found = cart.find(x => x.id === id);
  if (found) found.qty = (found.qty || 1) + 1; else cart.push({ id, qty: 1, addedAt: Date.now() });
  saveCart(cart);
}

// ====== Modal helpers ======
function openModal(product) {
  modalTitle.textContent = product.name;
  modalImg.src = resolveImageURL(product.image);
  modalImg.alt = `Perfume ${product.name}`;

  // Asegurar que el modal no recorte la imagen
  modalImg.classList.remove('object-cover');
  modalImg.classList.add('object-contain');
  // Opcional: limitar altura si lo necesitas
  // modalImg.classList.add('max-h-80');

  modalBrand.textContent = product.brand;
  modalDesc.textContent = product.description;
  modalPrice.textContent = fmtPrice.format(product.price);
  modalAdd.onclick = () => addToCart(product.id);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
function closeModal() { modal.classList.add('hidden'); modal.classList.remove('flex'); }
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// ====== URL Sync ======
function syncURL(term, minP, maxP, sortVal, page) {
  const params = new URLSearchParams();
  if (term) params.set('q', term);
  if (minP) params.set('min', minP);
  if (maxP && isFinite(maxP)) params.set('max', maxP);
  if (sortVal) params.set('sort', sortVal);
  if (page && page > 1) params.set('page', String(page));
  const qmark = params.toString();
  history.replaceState({}, '', `${location.pathname}${qmark ? '?' + qmark : ''}`);
}
function loadFromURL() {
  const u = new URLSearchParams(location.search);
  q.value = u.get('q') || '';
  min.value = u.get('min') || '';
  max.value = u.get('max') || '';
  sort.value = u.get('sort') || '';
  currentPage = parseInt(u.get('page') || '1', 10) || 1;
}

// ====== Filtro + ordenamiento ======
function applyFilters(triggerPaginationReset = false) {
  const term = (q.value || '').toLowerCase();
  const minP = parseFloat(min.value);
  const maxP = parseFloat(max.value);
  const minF = isNaN(minP) ? 0 : minP;
  const maxF = isNaN(maxP) ? Infinity : maxP;

  if (triggerPaginationReset) currentPage = 1;

  let list = allPerfumes.filter(p => {
    const matchText = (p.brand + ' ' + p.name).toLowerCase().includes(term);
    const matchPrice = p.price >= minF && p.price <= maxF;
    return matchText && matchPrice;
  });

  switch (sort.value) {
    case 'price-asc': list.sort((a,b) => a.price - b.price); break;
    case 'price-desc': list.sort((a,b) => b.price - a.price); break;
    case 'name-asc': list.sort((a,b) => a.name.localeCompare(b.name)); break;
  }

  renderPerfumes(list);
  syncURL(term, isFinite(minF) && minF > 0 ? minF : '', isFinite(maxF) && maxF !== Infinity ? maxF : '', sort.value, currentPage);
}

// ====== Paginación ======
function paginate(list, page = 1, size = pageSize) {
  const start = (page - 1) * size;
  return list.slice(start, start + size);
}
// ====== Render ====== 
function renderPerfumes(list) {
  container.innerHTML = '';
  skeleton.classList.add('hidden');

  // Paginación
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const pageItems = paginate(list, currentPage, pageSize);

  // Mostrar/ocultar paginación
  if (total > pageSize) {
    pagination.classList.remove('hidden');
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  } else {
    pagination.classList.add('hidden');
  }

  if (pageItems.length === 0) {
    container.innerHTML = `<p class="text-center text-lg text-gray-500 col-span-full">No se encontraron perfumes con esos filtros.</p>`;
    return;
  }

  // Tarjetas
  pageItems.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300';

    card.innerHTML = `
      <button class="relative w-full group" aria-label="Abrir detalle de ${p.name}">
        <!-- Alto fijo: la tarjeta NO cambia de tamaño -->
        <div class="w-full h-64 bg-white overflow-hidden flex items-center justify-center">
          <img
            loading="lazy"
            src="${p.image}"
            alt="Perfume ${p.name}"
            class="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            onerror="this.src='https://placehold.co/600x600?text=Sin+imagen'"
          />
        </div>
      </button>
      <div class="p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-1">${p.name}</h3>
        <p class="text-sm font-medium text-gray-500 mb-2">${p.brand}</p>
        <p class="text-sm text-gray-600 mb-4 line-clamp-3">${p.description}</p>
        <div class="flex justify-between items-center">
          <span class="text-2xl font-bold text-gray-900">${fmtPrice.format(p.price)}</span>
          <button class="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium hover:bg-indigo-700 add-btn">Agregar</button>
        </div>
      </div>
    `;

    // Eventos: abrir modal + agregar carrito
    const openBtn = card.querySelector('button[aria-label^="Abrir detalle"]');
    openBtn.addEventListener('click', () => openModal(p));
    card.querySelector('.add-btn').addEventListener('click', () => addToCart(p.id));

    container.appendChild(card);
  });
}
// ====== Debounce inputs ======
let debounceId;
[q, min, max, sort].forEach(el => {
  el.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => applyFilters(true), 200);
  });
});

// ====== Paginación events ======
prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; applyFilters(); } });
nextBtn.addEventListener('click', () => { currentPage++; applyFilters(); });

// ====== Carga de datos ======
async function loadData() {
  try {
    const res = await fetch('./data/perfumes.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar el catálogo');
    allPerfumes = await res.json();
  } catch (err) {
    console.error(err);
    skeleton.classList.add('hidden');
    container.innerHTML = `<p class="text-center text-red-600">Error cargando datos. Revisa la ruta de <code>data/perfumes.json</code>.</p>`;
    return;
  }
  updateCartCount();
  loadFromURL();
  applyFilters();
}

// ====== Init ======
document.addEventListener('DOMContentLoaded', loadData);

// ====== Carrito (demo) ======
cartBtn.addEventListener('click', () => {
  const cart = getCart();
  if (!cart.length) { alert('Tu carrito está vacío'); return; }
  const lines = cart.map(item => {
    const p = allPerfumes.find(x => x.id === item.id);
    return `• ${p ? p.name : item.id} x${item.qty}`;
  });
  alert('Carrito:\n' + lines.join('\n'));
});
