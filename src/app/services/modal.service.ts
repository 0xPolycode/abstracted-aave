import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  private modalDataSub = new BehaviorSubject<ModalData | null>(null)
  modalData$ = this.modalDataSub.asObservable()

  openModal(modalData: ModalData) {
    this.modalDataSub.next(modalData)
  }

  dismissModal() {
    this.modalDataSub.next(null)
  }

  openError(title: string, msg: string) {
    this.modalDataSub.next({
      message: msg,
      title: title,
      type: 'error'
    })
  }

}

export type ModalData = {
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success'
}