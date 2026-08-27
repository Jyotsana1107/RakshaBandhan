const pathParts = window.location.pathname.split('/').filter(Boolean);
const id = pathParts[pathParts.length - 1];

const loadingState = document.getElementById('loadingState');
const notFoundState = document.getElementById('notFoundState');
const experience = document.getElementById('experience');

async function loadExperience() {
  try {
    const res = await fetch(`/api/rakhi/${id}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    populate(data);
    loadingState.hidden = true;
    experience.hidden = false;
  } catch (err) {
    loadingState.hidden = true;
    notFoundState.hidden = false;
  }
}

function populate(data) {
  const displayName = data.nickname || data.siblingName;

  document.getElementById('nameGreeting').textContent = displayName;
  document.getElementById('introMessage').textContent = data.message;
  document.getElementById('bondFinal').textContent =
    `I'd still choose you as my ${(data.relationship || 'sibling').toLowerCase()} every single time.`;
  document.getElementById('rakhiHappy').textContent = `Happy Raksha Bandhan, ${displayName}.`;
  document.getElementById('finalMessageText').textContent =
    `Whatever else I forget to say — I'm always in your corner, ${displayName}.`;
  document.getElementById('finalSignoff').textContent = `— ${data.senderName}`;

  const memoryScreen = document.getElementById('memoryScreen');
  if (data.memory) {
    document.getElementById('memoryText').textContent = `Remember when we... ${data.memory}`;
  } else {
    memoryScreen.remove();
  }

  const funnyScreen = document.getElementById('funnyScreen');
  if (data.funnyLine) {
    document.getElementById('funnyText').textContent = data.funnyLine;
    funnyScreen.hidden = false;
  }

  const collage = document.getElementById('photoCollage');
  const photosSection = collage.closest('.screen');
  if (data.photos && data.photos.length) {
    data.photos.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `A photo of ${data.senderName} and ${data.siblingName}`;
      collage.appendChild(img);
    });
  } else {
    photosSection.remove();
  }

  document.title = `A surprise for ${displayName}`;
}

// Thread scroll progress
const threadFill = document.getElementById('threadFill');
const THREAD_LENGTH = 620;
function updateThreadProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  threadFill.style.strokeDashoffset = String(THREAD_LENGTH * (1 - progress));
}
window.addEventListener('scroll', updateThreadProgress, { passive: true });

// Reveal-on-scroll for each screen
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.45 });

function observeScreens() {
  document.querySelectorAll('.screen').forEach(s => observer.observe(s));
}

// Envelope open -> reveal rest of experience
document.getElementById('openBtn').addEventListener('click', () => {
  const rest = document.getElementById('restOfExperience');
  rest.hidden = false;
  observeScreens();
  requestAnimationFrame(() => {
    document.querySelector('.screen-2').scrollIntoView({ behavior: 'smooth' });
  });
});

// Final message reveal + confetti
document.getElementById('lastBtn').addEventListener('click', () => {
  document.getElementById('finalMessage').hidden = false;
  document.getElementById('lastBtn').style.display = 'none';
  launchConfetti();
});

function launchConfetti() {
  const container = document.getElementById('confetti');
  const colors = ['#C23B3B', '#E8963E', '#1F5C56', '#F3D9CE'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

loadExperience();
observeScreens();
