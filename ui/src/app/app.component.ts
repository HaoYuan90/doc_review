import { Component } from '@angular/core';

@Component({
  selector: 'sidebar-menu',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less',
})
export class AppComponent {
  title = 'Menu';

  public onDebugClick(): void {
    console.log('Debug button clicked');
  }

  public onUpdateClick(): void {
    console.log('Update button clicked');
  }
}
