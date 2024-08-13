import { Component } from '@angular/core';
import { ModalData, ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-modal-info',
  templateUrl: './modal-info.component.html',
  styleUrl: './modal-info.component.css'
})
export class ModalInfoComponent {

  constructor(private modalService: ModalService) {
  }

  modalData$ = this.modalService.modalData$

  dismissModal() {
    this.modalService.dismissModal()
  }


} 
