import { trigger, state, style, animate, transition } from '@angular/animations';

export const fadeInAnimation = trigger('fadeIn', [
  // Fade in when the element is added to the DOM
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-in', style({ opacity: 1 }))
  ]),
  // Optional: Fade out when the element is removed
  transition(':leave', [
    animate('0ms ease-out', style({ opacity: 0 }))
  ])
]);
