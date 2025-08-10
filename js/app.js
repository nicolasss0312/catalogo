/* ========= Utilidades de imágenes ========= */
// Convierte links de Drive compartidos a formato que sí carga en GH Pages
function resolveImageURL(url) {
  const m = /\/d\/([^/]+)/.exec(url);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

/* ========= Portadas por marca (opcional) ========= */
// Coloca aquí la imagen de portada de cada marca (usar URL lh3 o archivo local)
const BRAND_COVERS = {
  // Ejemplo:
  // "Carolina Herrera": "https://lh3.googleusercontent.com/d/TU_ID_DE_DRIVE",
  // "Dior": "./assets/brands/dior.png",
  // "Chanel": "https://lh3.googleusercontent.com/d/OTRO_ID",
};

/* ========= WhatsApp (config) ========= */
const COUNTRY_CODE = '57'; // Colombia (cámbialo si aplica)
const RAW_WA_NUMBERS = ['3006952728', '3008435173']; // tus números visibles
const WA_NUMBERS = RAW_WA_NUMBERS.map(n => `${COUNTRY_CODE}${n.replace(/\D/g, '')}`);

function waLink(num, product) {
  const msg = `Hola! Quiero consultar por ${product.brand} - ${product.name}.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

/* ========= Estado global ========= */
let allPerfumes = [];
let currentPage = 1;
const pageSize = 12;
let activeBrand = ""; // "" = landing (todas las marcas)

/* ========= Selectores ========= */
const brandsView  = document.getElementById('brands-view');   // grid de marcas
const filtersBar  = document.getElementById('filters-bar');   // barra de filtros/orden
const brandHeader = document.getElementById('brand-header');  // header con "volver" y título
const backBtn     = document.getElementById('back-to-brands');
const brandTitle  = document.getElementById('brand-title');

const container = document.getElementById('perfume-container'); // grid de productos
const skeleton  = document.getElementById('skeleton');

const q    = document.getElementById('q');
const min  = document.getElementById('min');
const max  = document.getElementById('max');
const sort = document.getElementById('sort');

const pagination = document.getElementById('pagination');
const prevBtn    = document.getElementById('prev');
const nextBtn    = document.getElementById('next');
const pageInfo   = document.getElementById('page-info');

/* ========= Modal ========= */
const modal      = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalImg   = document.getElementById('modal-img');
const modalBrand = document.getElementById('modal-brand');
const modalDesc  = document.getElementById('modal-desc');
const modalPrice = document.getElementById('modal-price'); // lo ocultamos
const modalAdd   = document.getElementById('modal-add');

/* ========= Carrito (oculto) ========= */
const CART_KEY  = 'perfume_cart';
const cartBtn   = document.getElementById('cart-btn');
const cartCount = document.getElementById('cart-count');
cartBtn?.classList.add('hidden'); // ocultar botón flotante

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  cartCount && (cartCount.textContent = getCart().reduce((acc, it) => acc + (it.qty || 1), 0));
}

/* ========= Modal ========= */
function openModal(product) {
  modalTitle.textContent = product.name;
  modalImg.src = resolveImageURL(product.image);
  modalImg.alt = `Perfume ${product.name}`;
  modalImg.classList.remove('object-cover');
  modalImg.classList.add('object-contain');

  modalBrand.textContent = product.brand;
  modalDesc.textContent  = product.description;

  // ocultar precio
  modalPrice?.classList.add('hidden');

  // Botón principal = WhatsApp 1
  modalAdd.textContent = `WhatsApp ${RAW_WA_NUMBERS[0]}`;
  modalAdd.onclick = () => window.open(waLink(WA_NUMBERS[0], product), '_blank');

  // Botón secundario = WhatsApp 2 (si no existe, crearlo)
  let modalAdd2 = document.getElementById('modal-add-2');
  if (!modalAdd2) {
    modalAdd2 = document.createElement('button');
    modalAdd2.id = 'modal-add-2';
    modalAdd2.className = 'w-full mt-2 border px-4 py-2 rounded-full hover:bg-gray-50';
    modalAdd.parentNode.appendChild(modalAdd2);
  }
  modalAdd2.textContent = `WhatsApp ${RAW_WA_NUMBERS[1]}`;
  modalAdd2.onclick = () => window.open(waLink(WA_NUMBERS[1], product), '_blank');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
function closeModal() { modal.classList.add('hidden'); modal.classList.remove('flex'); }
modalClose && modalClose.addEventListener('click', closeModal);
modal && modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

/* ========= Landing de MARCAS ========= */
function getBrandsData() {
  // { name, count, image } usando la 1ª imagen disponible de esa marca
  const map = new Map();
  for (const p of allPerfumes) {
    const key = p.brand;
    if (!map.has(key)) {
      map.set(key, { name: key, count: 1, image: p.image });
    } else {
      const obj = map.get(key);
      obj.count += 1;
      if (!obj.image && p.image) obj.image = p.image;
    }
  }
  return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
}

function renderBrands() {
  if (!brandsView) return;
  brandsView.innerHTML = '';
  const brands = getBrandsData();
  if (brands.length === 0) {
    brandsView.innerHTML = `<p class="text-center text-gray-500 col-span-full">Aún no hay marcas para mostrar.</p>`;
    return;
  }
  brands.forEach(b => {
    const card = document.createElement('button');
    card.className = 'bg-white rounded-2xl shadow hover:shadow-lg transition p-4 text-left';

    // Usa portada fija si existe, si no la 1ª imagen de la marca
    const coverSrc = BRAND_COVERS[b.name] || b.image || '';
    const imgSrc   = resolveImageURL(coverSrc);
    const fallback = `https://placehold.co/600x300?text=${encodeURIComponent(b.name)}`;

    card.innerHTML = `
      <div class="w-full h-40 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center mb-3">
        <img src="${imgSrc || fallback}" alt="${b.name}"
             class="max-h-full max-w-full object-contain"
             onerror="this.src='${fallback}'" />
      </div>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-800">${b.name}</h3>
        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">${b.count}</span>
      </div>
    `;
    card.addEventListener('click', () => goToBrand(b.name));
    brandsView.appendChild(card);
  });
}

function showBrandsView() {
  activeBrand = "";
  brandsView && brandsView.classList.remove('hidden');
  filtersBar && filtersBar.classList.add('hidden');
  brandHeader && brandHeader.classList.add('hidden');
  container && container.classList.add('hidden');
  pagination && pagination.classList.add('hidden');
  history.replaceState({}, '', location.pathname); // limpiar querystring
}

function showCatalogView() {
  brandsView && brandsView.classList.add('hidden');
  filtersBar && filtersBar.classList.remove('hidden');
  brandHeader && brandHeader.classList.remove('hidden');
  container && container.classList.remove('hidden');
}

function goToBrand(brand) {
  activeBrand = brand;
  currentPage = 1;
  brandTitle && (brandTitle.textContent = brand);
  showCatalogView();
  applyFilters(true);
}

/* ========= URL Sync ========= */
function syncURL(term, minP, maxP, sortVal, page) {
  const params = new URLSearchParams();
  if (activeBrand) params.set('brand', activeBrand);
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
  q   && (q.value   = u.get('q')    || '');
  min && (min.value = u.get('min')  || '');
  max && (max.value = u.get('max')  || '');
  sort&& (sort.value= u.get('sort') || '');
  activeBrand = u.get('brand') || '';
  currentPage = parseInt(u.get('page') || '1', 10) || 1;
}

/* ========= Filtros + Orden ========= */
function applyFilters(triggerPaginationReset = false) {
  const term = (q?.value || '').toLowerCase();
  const minP = parseFloat(min?.value);
  const maxP = parseFloat(max?.value);
  const minF = isNaN(minP) ? 0 : minP;
  const maxF = isNaN(maxP) ? Infinity : maxP;

  if (triggerPaginationReset) currentPage = 1;

  let list = allPerfumes.filter(p => {
    const matchBrand = activeBrand ? p.brand === activeBrand : true;
    const matchText  = (p.brand + ' ' + p.name).toLowerCase().includes(term);
    const matchPrice = p.price >= minF && p.price <= maxF; // ya no mostramos precio, pero sirve para filtrar
    return matchBrand && matchText && matchPrice;
  });

  switch (sort?.value) {
    case 'price-asc':  list.sort((a,b) => a.price - b.price); break;
    case 'price-desc': list.sort((a,b) => b.price - a.price); break;
    case 'name-asc':   list.sort((a,b) => a.name.localeCompare(b.name)); break;
  }

  // Título de marca (con cantidad)
  if (brandTitle) {
    const count = list.length;
    brandTitle.textContent = activeBrand ? `${activeBrand} · ${count}` : '';
  }

  renderPerfumes(list);
  syncURL(term, isFinite(minF) && minF > 0 ? minF : '', isFinite(maxF) && maxF !== Infinity ? maxF : '', sort?.value, currentPage);
}

/* ========= Paginación ========= */
function paginate(list, page = 1, size = pageSize) {
  const start = (page - 1) * size;
  return list.slice(start, start + size);
}

/* ========= Render de tarjetas ========= */
function renderPerfumes(list) {
  container.innerHTML = '';
  skeleton?.classList.add('hidden');

  // Paginación
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const pageItems = paginate(list, currentPage, pageSize);

  if (pagination) {
    if (total > pageSize) {
      pagination.classList.remove('hidden');
      pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    } else {
      pagination.classList.add('hidden');
    }
  }

  if (pageItems.length === 0) {
    container.innerHTML = `<p class="text-center text-lg text-gray-500 col-span-full">No se encontraron perfumes con esos filtros.</p>`;
    return;
  }

  pageItems.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300';

    card.innerHTML = `
      <button class="relative w-full group" aria-label="Abrir detalle de ${p.name}">
        <div class="w-full h-64 bg-white overflow-hidden flex items-center justify-center">
          <img
            loading="lazy"
            src="${resolveImageURL(p.image)}"
            alt="Perfume ${p.name}"
            class="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            onerror="this.src='https://placehold.co/600x600?text=Sin+imagen'"
          />
        </div>
      </button>
      <div class="p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-1">${p.name}</h3>
        <p class="text-sm font-medium text-gray-500 mb-4">${p.brand}</p>

        <!-- Botones de WhatsApp -->
        <div class="flex flex-wrap gap-2">
          <a target="_blank"
             href="${waLink(WA_NUMBERS[0], p)}"
             class="px-4 py-2 rounded-full bg-green-600 text-white hover:bg-green-700">
             WhatsApp ${RAW_WA_NUMBERS[0]}
          </a>
          <a target="_blank"
             href="${waLink(WA_NUMBERS[1], p)}"
             class="px-4 py-2 rounded-full border hover:bg-gray-50">
             WhatsApp ${RAW_WA_NUMBERS[1]}
          </a>
        </div>
      </div>
    `;

    const openBtn = card.querySelector('button[aria-label^="Abrir detalle"]');
    openBtn.addEventListener('click', () => openModal(p));

    container.appendChild(card);
  });
}

/* ========= Eventos ========= */
// Inputs (debounce)
let debounceId;
[q, min, max, sort].forEach(el => {
  if (!el) return;
  el.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => applyFilters(true), 200);
  });
});
// Paginación
prevBtn && prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; applyFilters(); } });
nextBtn && nextBtn.addEventListener('click', () => { currentPage++; applyFilters(); });
// Volver a marcas
backBtn && backBtn.addEventListener('click', showBrandsView);

/* ========= Carga de datos ========= */
async function loadData() {
  try {
    const res = await fetch('./data/perfumes.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar el catálogo');
    allPerfumes = await res.json();
  } catch (err) {
    console.error(err);
    skeleton?.classList.add('hidden');
    container.innerHTML = `<p class="text-center text-red-600">Error cargando datos. Revisa la ruta de <code>data/perfumes.json</code>.</p>`;
    return;
  }
  updateCartCount();
  loadFromURL();
  renderBrands();
  if (activeBrand) { // si llega con ?brand=...
    brandTitle && (brandTitle.textContent = activeBrand);
    showCatalogView();
    applyFilters();
  } else {
    showBrandsView(); // landing por defecto
  }
}

/* ========= Init ========= */
document.addEventListener('DOMContentLoaded', loadData);



