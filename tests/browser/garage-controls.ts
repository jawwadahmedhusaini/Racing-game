import type {Page} from '@playwright/test';

export async function openVehicles(page:Page){
  if(!await page.locator('#modal.pit-vehicles').count())await page.getByRole('button',{name:'Vehicles',exact:true}).click();
}
export async function openTune(page:Page){
  if(!await page.locator('#modal.pit-tune').count())await page.getByRole('button',{name:'Tune',exact:true}).click();
}
export async function closeTune(page:Page){
  if(await page.locator('#modal.pit-tune').count())await page.getByRole('button',{name:'Close tuning'}).click();
}
