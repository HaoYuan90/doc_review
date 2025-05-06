import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'sidebar-menu',
  imports: [MatButtonModule, MatTooltipModule, MatToolbarModule],
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
