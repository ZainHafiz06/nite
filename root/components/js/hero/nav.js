export function hero_nav_clr() {
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const links = Array.from(document.querySelectorAll('.hr-nav a'));

    const linkMap = new Map(
        links
            .filter(a => a.hash)
            .map(a => [a.hash.toLowerCase(), a.querySelector('h1')])
    );

    const setActive = (hash) => {
        linkMap.forEach(h1 => { 
            h1.classList.remove('-b'); 
            h1.classList.add('-f'); 
        });

        const target = linkMap.get(hash.toLowerCase());
        if (target) { 
            target.classList.remove('-f'); 
            target.classList.add('-b'); 
        }
    };

    const observer = new IntersectionObserver((entries) => {
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

            if (visible) setActive(`#${visible.target.id}`);
        }, {
            root: null,
            threshold: [0.2, 0.4, 0.6],
            rootMargin: '-20% 0px -40% 0px'
        }
    );

    sections.forEach(sec => observer.observe(sec));

    if (location.hash && linkMap.has(location.hash.toLowerCase())) {
        setActive(location.hash);
    } else if (sections[0]) {
        setActive(`#${sections[0].id}`);
    }
}

export function hero_nav_scroll() {
    gsap.registerPlugin(ScrollTrigger);

    const scl = document.querySelector(".hr-scl-contents");
    const nav = document.querySelector(".hr-nav");

    gsap.to(nav, {
        scrollTrigger: {
            trigger: nav,
            start: "top 5%",
            end: "max",
            pin: true,
            pinSpacing: false,
            scrub: 4,
            // markers: {startColor: "blue", endColor: "green"}
        }
    });

    gsap.to(scl, {
        scrollTrigger: {
            trigger: scl,
            start: "top 5%",
            end: "max",
            pin: true,
            pinSpacing: false,
            scrub: 4,
            // markers: {startColor: "red", endColor: "yellow"}
        }
    });
}