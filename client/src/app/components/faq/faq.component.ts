import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-faq',
  imports: [CommonModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css'
})
export class FaqComponent {
  faqs = [
    {
      question: 'How does this work?',
      answer: 'This is a web application that allows you to blur sensitive information in images. It uses a machine learning model to detect and blur them.',
      isOpen: false
    },
    {
      question: 'How do I use this?',
      answer: 'You can upload an image and select the type of information you want to blur. The model will detect the information and blur it. You can then download the blurred image.',
      isOpen: false
    },
    {
      question: 'What types of information can I blur?',
      answer: 'You can blur faces, phone numbers, email addresses, credit card numbers, and bank account numbers.',
      isOpen: false
    },
    {
      question: 'How accurate is this?',
      answer: 'The model is trained on a large dataset and can detect sensitive information with high accuracy.',
      isOpen: false
    },
    {
      question: 'What happens to my images?',
      answer: 'Your images are not stored on our servers. They are processed by the model and the blurred image is returned to you.',
      isOpen: false
    }
  ];

  toggleFaq(index: number) {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }
}
