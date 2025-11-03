export function mn_1_toggle() {
    const links = document.querySelectorAll('.hr-nav a');
    const menu = document.querySelector('menu');

    links.forEach(link => {
        if (link.querySelector('h1').innerHTML !== "home") {
            link.addEventListener("mouseover", () => { 
                menu.style.opacity = 1;
                
            });

            link.addEventListener("mouseout", () => { 
                menu.style.opacity = 0;
                menu.addEventListener("mouseout", () => { menu.style.opacity = 0; });
            });
        }
    });

    menu.addEventListener("mouseover", () => { menu.style.opacity = 1; });
    menu.addEventListener("mouseout", () => { menu.style.opacity = 0; });
}