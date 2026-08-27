const form = document.getElementById('rakhiForm');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');
const resultCard = document.getElementById('resultCard');
const resultLink = document.getElementById('resultLink');
const copyBtn = document.getElementById('copyBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const viewBtn = document.getElementById('viewBtn');

photoInput.addEventListener('change', () => {
  photoPreview.innerHTML = '';
  const files = Array.from(photoInput.files).slice(0, 6);
  files.forEach(file => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    photoPreview.appendChild(img);
  });
});

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

async function createUploadFile(file) {
  const image = await createImageBitmap(file);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  if (!blob) throw new Error('Could not prepare photo');
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const data = new FormData(form);
  if (!data.get('senderName').trim() || !data.get('siblingName').trim() || !data.get('message').trim()) {
    showError('Please fill in your name, their name, and a message before continuing.');
    return;
  }
  if (photoInput.files.length > 6) {
    showError('Please choose up to 6 photos.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Wrapping it up...';

  try {
    const photos = Array.from(photoInput.files);
    data.delete('photos');
    for (const photo of photos) data.append('photos', await createUploadFile(photo));

    const res = await fetch('/api/create', { method: 'POST', body: data });
    const json = await res.json();

    if (!res.ok) {
      showError(json.error || 'Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Wrap It Up <span aria-hidden="true">&rarr;</span>';
      return;
    }

    const fullUrl = `${window.location.origin}${json.url}`;
    resultLink.value = fullUrl;
    whatsappBtn.href = `https://wa.me/?text=${encodeURIComponent('I made something for you 💛 ' + fullUrl)}`;
    viewBtn.href = fullUrl;

    form.hidden = true;
    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    showError('Could not reach the server. Please check your connection and try again.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Wrap It Up <span aria-hidden="true">&rarr;</span>';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultLink.value);
    copyBtn.textContent = 'Copied';
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1800);
  } catch {
    resultLink.select();
    document.execCommand('copy');
  }
});
