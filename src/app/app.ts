import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
  imports: []
})
export class AppComponent implements OnInit, OnDestroy {
  private observer!: IntersectionObserver;
  private menuToggle: HTMLElement | null = null;
  private navLinks: HTMLElement | null = null;
  private navItems: NodeListOf<Element> | null = null;

  // Manual tracking flags and timers
  private isManualNavClick = false;
  private clickTimeout: any;
  
  // Guard to block background observers completely during initial page rendering setup
  private isInitialLoadSettlePhase = true;

  constructor() {}

  ngOnInit(): void {
    this.initScrollSpy();
    this.initMobileMenu();
    
    // 1. Instantly force the baseline highlight state onto 'home' on fresh load
    this.updateActiveNavState('home');

    // 2. Allow DOM engine and scroll-snap layers to stabilize before unblocking spy
    setTimeout(() => {
      this.isInitialLoadSettlePhase = false;
    }, 200); 
  }

  /**
   * Initializes mobile menu toggle functionality with proper event handling
   * and automatic menu dismissal when navigation items are clicked
   */
  private initMobileMenu(): void {
    this.menuToggle = document.getElementById('menuToggle');
    this.navLinks = document.getElementById('navLinks');
    
    // Fallback selector handles matches inside or outside parent .nav-links containers cleanly
    this.navItems = document.querySelectorAll('.nav-item, .nav-links a');

    if (this.menuToggle && this.navLinks) {
      // Menu toggle click handler
      this.menuToggle.addEventListener('click', (event: Event) => {
        event.stopPropagation();
        this.menuToggle!.classList.toggle('active');
        this.navLinks!.classList.toggle('active');
      });

      // Close menu when clicking outside
      document.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;
        if (
          this.menuToggle &&
          this.navLinks &&
          !this.menuToggle.contains(target) &&
          !this.navLinks.contains(target)
        ) {
          this.menuToggle.classList.remove('active');
          this.navLinks.classList.remove('active');
        }
      });

      // Handle direct link clicks seamlessly
      this.navItems?.forEach((item) => {
        item.addEventListener('click', (event: Event) => {
          // Instantly dismiss mobile overlay panels
          this.menuToggle!.classList.remove('active');
          this.navLinks!.classList.remove('active');

          // Engage manual navigation lock to prevent intermediate section intersections from overwriting focus states
          this.isManualNavClick = true;
          clearTimeout(this.clickTimeout);

          // Get targeted hash element string
          const href = (item as HTMLAnchorElement).getAttribute('href');
          if (href && href.startsWith('#')) {
            const targetId = href.substring(1);
            // Instantly transition active selection marker to the explicitly clicked item
            this.updateActiveNavState(targetId);
          }

          // Release the scroll lock once the smooth-scroll window animation finishes moving
          this.clickTimeout = setTimeout(() => {
            this.isManualNavClick = false;
          }, 950); 
        });
      });
    }
  }

  /**
   * Initializes scroll spy to update active navigation link based on visible section.
   * Utilizes a highly centered, balanced tracking window to avoid pre-selecting accidental items.
   */
  private initScrollSpy(): void {
    const scrollContainer = document.querySelector('.scroll-container');

    const options = {
      root: scrollContainer,
      rootMargin: '-45% 0px -45% 0px', 
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      // Absolutely ignore background intersections during initialization or manual menu link clicks
      if (this.isInitialLoadSettlePhase || this.isManualNavClick) return;

      // If container scroll position is sitting perfectly at the top edge, force 'home' to remain active
      if (scrollContainer && scrollContainer.scrollTop === 0) {
        this.updateActiveNavState('home');
        return;
      }

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) {
            this.updateActiveNavState(id);
          }
        }
      });
    }, options);

    // FIXED TARGET SELECTION ARRAY: Replaced '#value proposition' with '#approach' to perfectly 
    // match the anchor href layout tracking target element in your HTML.
    const targetSections = document.querySelectorAll(
      '#home, #about, #solutions, #approach, #contact'
    );
    targetSections.forEach((section) => this.observer.observe(section));
  }

  /**
   * Clears old highlight visual rules from header items and targets only the matching visible element
   */
  private updateActiveNavState(activeId: string): void {
    const navItems = document.querySelectorAll('.nav-item, .nav-links a');
    navItems.forEach((item) => {
      item.classList.remove('active');
      const href = (item as HTMLAnchorElement).getAttribute('href');
      if (href === `#${activeId}`) {
        item.classList.add('active');
      }
    });
  }

  /**
   * Disconnect pointers safely during standard Angular component lifecycle teardowns
   */
  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
  }
}