import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RelatedImagesData } from '../utils/image-loader-3';
import { CropArea } from '../utils/user-comment-data';

@Component({
  selector: 'ie-info-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!allowCrop">Cropping is disabled in the iNat folder.</div>
    <div *ngIf="allowCrop && relatedImagesData">
      {{ relatedImagesData.relatedImages.length }} related images, {{ relatedImagesData.cropAreas.length }} crop areas
      found.
    </div>
    <div *ngIf="selectedCropArea" class="right-align">
      Selected area: X {{ selectedCropArea.x }}; Y {{ selectedCropArea.y }}; {{ selectedCropArea.width }} x
      {{ selectedCropArea.height }}
    </div>
  `,
  styleUrl: 'info-bar.component.scss',
})
export class InfoBarComponent {
  @Input() allowCrop = false;
  @Input() relatedImagesData: RelatedImagesData | null = null;
  @Input() selectedCropArea: CropArea | null = null;
}
