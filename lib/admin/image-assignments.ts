export interface ImageAssignment {
  imageName: string;
  itemType: 'dish' | 'drink';
  itemId: number;
}

// One image may serve several products; a product can only have one image.
export function toggleImageAssignment(current: ImageAssignment[], next: ImageAssignment): ImageAssignment[] {
  const sameTarget = (item: ImageAssignment) => item.itemType === next.itemType && item.itemId === next.itemId;
  const removing = current.some(item => sameTarget(item) && item.imageName === next.imageName);
  const remaining = current.filter(item => !sameTarget(item));
  return removing ? remaining : [...remaining, next];
}
