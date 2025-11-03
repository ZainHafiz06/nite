export function hero_vis_scroll() {
    gsap.registerPlugin(ScrollTrigger);

    const vis = document.querySelector(".sphere");

    gsap.to(vis, {
        x: "50%",
        scale: 0.5,

        scrollTrigger: {
            trigger: vis,
            start: "top 0px",
            end: "max",
            pin: true,
            pinSpacing: false,
            scrub: 1
        }
    });
}