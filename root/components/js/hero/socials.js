export function logoIdentifier() {
  const iconColorMap = {
    "bxl-linkedin": "rgb(10, 102, 194)",
    "bxl-instagram": "#E1306C",
    "bxl-github": "#B46CC9",
    "bxl-twitter": "#1DA1F2",
    "bxl-meta": "#1877F2",
    "bxl-youtube": "#FF0000"
  };

  const socialBlocks = document.querySelectorAll('.hr-scl-content .btn-t2');

  socialBlocks.forEach(block => {
    const icon = block.querySelector('i');
    if (!icon) return;

    const matchedKey = Object.keys(iconColorMap).find(key =>
      icon.classList.contains(key)
    );

    if (matchedKey) {
      const color = iconColorMap[matchedKey];

      block.addEventListener('mouseenter', () => {
        icon.style.color = color;
        socialBlocks.setAttribute("style", `border: 1px solid ${color};`);
      });

      block.addEventListener('mouseleave', () => {
        icon.style.color = '';
      });
    }
  });
}