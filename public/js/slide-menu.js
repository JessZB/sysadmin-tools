// ============================================
// SLIDE MENU - MENÚ DESLIZANTE
// ============================================

(function() {
const d = document;

class SlideMenu {
    constructor() {
        this.overlay = d.getElementById('slideMenuOverlay');
        this.menu = d.getElementById('slideMenu');
        this.isOpen = false;
        this.init();
    }

    init() {
        // Event listeners para botones de abrir/cerrar
        const openButtons = d.querySelectorAll('[data-slide-menu-open]');
        const closeButtons = d.querySelectorAll('[data-slide-menu-close]');

        openButtons.forEach(btn => {
            btn.addEventListener('click', () => this.open());
        });

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });

        // Cerrar al hacer click en el overlay (fuera del menú)
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }

        // Cerrar con tecla ESC
        d.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Prevenir scroll del body cuando el menú está abierto
        this.preventBodyScroll();
    }

    open() {
        if (this.isOpen) return;

        this.overlay.classList.add('active');
        this.menu.classList.add('active');
        d.body.style.overflow = 'hidden';
        this.isOpen = true;

        // Animación de entrada de las cards
        this.animateCards();
    }

    close() {
        if (!this.isOpen) return;

        this.overlay.classList.remove('active');
        this.menu.classList.remove('active');
        d.body.style.overflow = '';
        this.isOpen = false;
    }

    animateCards() {
        const cards = this.menu.querySelectorAll('.menu-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + (index * 50));
        });
    }

    preventBodyScroll() {
        // Prevenir scroll cuando el menú está abierto
        this.overlay.addEventListener('touchmove', (e) => {
            if (this.isOpen) {
                e.preventDefault();
            }
        }, { passive: false });
    }
}

// Inicializar el menú cuando el DOM esté listo
d.addEventListener('DOMContentLoaded', () => {
    window.slideMenu = new SlideMenu();
});

// Hacer la clase global para acceso externo si es necesario
window.SlideMenu = SlideMenu;
})();
