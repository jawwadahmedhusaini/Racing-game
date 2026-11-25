const help = document.querySelector<HTMLDialogElement>('#driving-help')!;
document.getElementById('help')!.addEventListener('click', () => help.showModal());
help.addEventListener('click', event => {
  if (event.target !== help) return;
  const box = help.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) help.close();
});
