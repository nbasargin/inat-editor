import { Component } from '@angular/core';

@Component({
  selector: 'ie-file-access-not-supported',
  imports: [],
  template: `
    <div>File System Access API is not available! See supporting browsers:</div>
    <ul>
      <li>https://caniuse.com/native-filesystem-api</li>
      <li>https://developer.mozilla.org/en-US/docs/Web/API/File_System_API</li>
      <li>https://developer.chrome.com/docs/capabilities/web-apis/file-system-access</li>
    </ul>
  `,
  styles: ``,
})
export class FileAccessNotSupportedComponent {}
