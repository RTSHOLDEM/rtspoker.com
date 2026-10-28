// RTS site behaviour: rocket rooms, countdown, results reveal, testimonials, team table.

// ---- The page always opens at the top, for everyone ----
// Cause of the "opens at the bottom" bug: in-page links left #candidater in the address, so a refresh
// jumped back there, and browsers also restore the last scroll position. Fix: no scroll restore,
// strip any #hash on load, and in-page links scroll without writing a #hash.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
scrollTo(0, 0);
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const target = id ? document.getElementById(id) : null;
  e.preventDefault();
  document.body.classList.remove('locked'); // links inside a room close it first
  if (target) target.scrollIntoView({ behavior: 'smooth' }); else scrollTo({ top: 0, behavior: 'smooth' });
});

// ---- Rocket rooms: [data-room="ID"] opens <template class="room-tpl" data-id="ID"> ----
const rooms = [...document.querySelectorAll('.room-tpl')];
const room = document.querySelector('.room');
const roomPhoto = room.querySelector('.room-photo');
const roomBody = room.querySelector('.room-body');
const roomCount = room.querySelector('.room-count');
let ri = -1;

function photo(src) {
  const ph = '<div class="ph"><img src="img/logo.svg" alt="">Photo à venir</div>';
  if (!src) { roomPhoto.innerHTML = ph; return; }
  const img = new Image();
  img.alt = '';
  img.onerror = () => { roomPhoto.innerHTML = ph; };
  img.src = src;
  roomPhoto.replaceChildren(img);
}
function showRoom(i) {
  ri = (i + rooms.length) % rooms.length;
  const tpl = rooms[ri];
  photo(tpl.dataset.img);
  roomBody.replaceChildren(tpl.content.cloneNode(true));
  roomCount.textContent = (ri + 1) + ' / ' + rooms.length;
  room.scrollTop = 0;
}
function openRoom(id) {
  const i = rooms.findIndex(t => t.dataset.id === id);
  if (i < 0) return;
  room.classList.remove('bio');
  showRoom(i);
  document.body.classList.add('room-open', 'locked');
  room.querySelector('.room-close').focus({ preventScroll: true });
}
function closeRoom() { document.body.classList.remove('room-open', 'locked'); room.classList.remove('bio'); }

// ---- Team table: seats spread evenly around the oval, click = bio in the room card ----
const table = document.getElementById('ptable');
const seats = [...table.querySelectorAll('.seat')];
const holes = seats.map(() => { const h = document.createElement('span'); h.className = 'hole'; table.append(h); return h; });
function placeSeats() {
  // seats equally spaced along an ellipse around the rail (not by angle, so the long sides are not empty)
  const w = table.clientWidth, h = table.clientHeight, tall = h > w;
  const rx = (tall ? 0.43 : 0.47) * w, ry = (tall ? 0.45 : 0.44) * h, N = 720, pts = [], len = [0];
  for (let k = 0; k <= N; k++) {
    const t = -Math.PI / 2 + (k / N) * 2 * Math.PI;
    pts.push([rx * Math.cos(t), ry * Math.sin(t)]);
    if (k) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  }
  let k = 0;
  seats.forEach((seat, i) => {
    const target = ((i + 0.5) / seats.length) * len[N];
    while (len[k] < target) k++;
    const [x, y] = pts[k];
    seat.style.setProperty('--x', (50 + x / w * 100) + '%');
    seat.style.setProperty('--y', (50 + y / h * 100) + '%');
    // two cards in front of the seat, on the felt, facing the player
    holes[i].style.setProperty('--x', (50 + x * 0.62 / w * 100) + '%');
    holes[i].style.setProperty('--y', (50 + y * 0.62 / h * 100) + '%');
    holes[i].style.setProperty('--r', (Math.atan2(y, x) * 180 / Math.PI + 90) + 'deg');
  });
}
placeSeats();
addEventListener('resize', placeSeats);

const KIND = { staff: 'Staff', coach: 'Coach', mentor: 'Mentor' };
// Bio card. Source = a table seat, or a room face that carries its own data (e.g. "Mentor 2027").
// backId: the room to go back to when the bio was opened from a room.
function showBio(el, backId) {
  const d = el.dataset;
  photo(el.querySelector('img').getAttribute('src'));
  const tags = (d.tags || '').split(',').filter(Boolean).map(t => `<span>${t}</span>`).join('');
  const name = el.querySelector('.plate b') ? el.querySelector('.plate b').innerHTML : (d.name || d.person);
  const paras = (d.bio || '').split(/\n\s*\n/).map(t => `<p>${t}</p>`).join('');
  const video = d.video ? `<a class="r-video" href="${d.video}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>${d.videoLabel || 'Voir son interview'}</a>` : '';
  const back = backId ? `<button class="r-back" data-room="${backId}">← Retour</button>` : '';
  roomBody.innerHTML = `<p class="r-tag">La team RTS · ${KIND[d.kind] || ''}</p><h3 class="r-title">${name}</h3><p class="r-role">${d.role}</p><div class="r-chips">${tags}</div><div class="r-bio">${paras}</div>${video}${back}`;
  room.classList.add('bio');
  room.scrollTop = 0;
  document.body.classList.add('room-open', 'locked');
  room.querySelector('.room-close').focus({ preventScroll: true });
}
table.addEventListener('click', e => {
  const seat = e.target.closest('.seat');
  if (seat) showBio(seat);
});

document.addEventListener('click', e => {
  const face = e.target.closest('[data-person]');
  if (face) {
    const seat = seats.find(x => x.dataset.name === face.dataset.person);
    showBio(seat || face, rooms[ri] && rooms[ri].dataset.id);
    return;
  }
  const opener = e.target.closest('[data-room]');
  if (opener) { openRoom(opener.dataset.room); return; }
  const step = e.target.closest('[data-room-step]');
  if (step) { showRoom(ri + Number(step.dataset.roomStep)); return; }
  if (e.target.closest('[data-close]')) closeRoom();
});
document.addEventListener('keydown', e => {
  if (!document.body.classList.contains('room-open')) return;
  if (e.key === 'Escape') closeRoom();
  if (room.classList.contains('bio')) return;
  if (e.key === 'ArrowRight') showRoom(ri + 1);
  if (e.key === 'ArrowLeft') showRoom(ri - 1);
});

// ---- Countdown to the application deadline (22 Nov 2026, end of day, Paris time) ----
const deadline = new Date('2026-11-22T23:59:59+01:00').getTime();
const pad = n => String(n).padStart(2, '0');
function tick() {
  const left = deadline - Date.now();
  document.querySelectorAll('[data-countdown]').forEach(cd => {
    if (left <= 0) {
      cd.classList.add('closed');
      const label = cd.querySelector('.cd-label');
      if (label) label.textContent = 'Candidatures 2027 closes';
      return;
    }
    const s = Math.floor(left / 1000);
    cd.querySelector('[data-d]').textContent = pad(Math.floor(s / 86400));
    cd.querySelector('[data-h]').textContent = pad(Math.floor(s / 3600) % 24);
    cd.querySelector('[data-m]').textContent = pad(Math.floor(s / 60) % 60);
    cd.querySelector('[data-s]').textContent = pad(s % 60);
  });
}
tick();
setInterval(tick, 1000);

// ---- Results: one player at a time, lightning strike reveals the "after" curve ----
const res = document.getElementById('res');
const slides = [...res.querySelectorAll('.slide')];
const ctrl = res.querySelector('.gctrl');
const count = document.querySelector('.res-count b');
let si = 0;
function showSlide(i) {
  si = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle('active', k === si));
  res.classList.remove('show-after', 'strike');
  res.classList.toggle('pending', slides[si].classList.contains('pending'));
  slides[si].querySelector('.gbox').append(ctrl);
  count.textContent = si + 1;
}
res.querySelector('.reveal').addEventListener('click', () => {
  if (res.classList.contains('show-after')) { res.classList.remove('show-after'); return; }
  res.classList.remove('strike');
  void res.offsetWidth; // restart the animation
  res.classList.add('strike');
  setTimeout(() => res.classList.add('show-after'), 180);
  setTimeout(() => res.classList.remove('strike'), 800);
});
document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => showSlide(si + Number(b.dataset.step))));
showSlide(0);

// ---- Testimonials: one quote at a time, auto-advance, pause on hover ----
const quotes = [...document.querySelectorAll('.q')];
const dots = document.querySelector('.q-dots');
let qi = 0, timer;
function show(i) {
  qi = (i + quotes.length) % quotes.length;
  quotes.forEach((q, k) => q.classList.toggle('active', k === qi));
  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === qi));
}
quotes.forEach((q, k) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', 'Témoignage ' + (k + 1));
  b.addEventListener('click', () => { show(k); start(); });
  dots.append(b);
});
// Long quotes stay twice as long on screen
function start() { clearTimeout(timer); timer = setTimeout(() => { show(qi + 1); start(); }, quotes[qi].classList.contains('long') ? 14000 : 7000); }
const qbox = document.getElementById('quotes');
qbox.addEventListener('mouseenter', () => clearTimeout(timer));
qbox.addEventListener('mouseleave', start);
show(0);
start();
