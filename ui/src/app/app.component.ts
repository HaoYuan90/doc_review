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
    // @ts-ignore
    google.script.run
      .withFailureHandler((error: Error) => {
        console.error(
          'Failed to update document review table.',
          error
        );
      })
      .testInsert();
    console.log('Update button clicked');
  }
}
