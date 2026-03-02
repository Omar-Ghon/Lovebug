import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-mainview',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './mainview.component.html',
  styleUrl: './mainview.component.scss'
})
export class MainviewComponent {

}
