// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Journey, readSave, saveProgress } from '../src/systems/Journey';
import { Experience, type Actions } from '../src/ui/Experience';
let journey:Journey,ui:Experience,actions:Actions;
const click=(id:string)=>document.getElementById(id)!.click();
beforeEach(()=>{
  document.body.innerHTML='<canvas id="game" tabindex="0"></canvas><div id="hud"></div>';
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  localStorage.clear();journey=new Journey();
  actions={start:vi.fn(),continueRun:vi.fn(),resume:vi.fn(),menu:vi.fn(),reset:vi.fn(),camera:vi.fn(),cruise:vi.fn(),paint:vi.fn(),quality:vi.fn(),key:vi.fn()};
  ui=new Experience(journey,actions);ui.update(0,0,0,100);
});
describe('Grand Tour player flow',()=>{
  it('shows distance, gates and medal targets before starting',()=>{
    click('expedition');const modal=document.getElementById('modal')!;
    expect(modal.textContent).toContain('5.9 km');expect(modal.textContent).toContain('12');expect(modal.textContent).toContain('02:55');
    expect(actions.start).not.toHaveBeenCalled();click('begin-drive');expect(actions.start).toHaveBeenCalledWith(0,'expedition');
  });
  it('can cancel briefing and keep chapter selection intact',()=>{
    click('expedition');click('cancel-drive');expect(document.getElementById('modal')!.classList.contains('hidden')).toBe(true);
    click('start');click('begin-drive');expect(actions.start).toHaveBeenCalledWith(0,'tour');
  });
  it('shows twelve-gate HUD, saves results and retries the same mode',()=>{
    journey.start(0,'expedition');journey.phase='driving';journey.checkpoint=5;ui.update(30,2500,0,70);
    expect(document.getElementById('checkpoints')!.textContent).toBe('5 / 12 CHECKPOINTS');
    expect(document.getElementById('region')!.textContent).toBe('CYPRESS RIDGE');
    journey.elapsed=180;journey.finish(true);ui.update(0,5900,0,50);
    expect(document.getElementById('modal')!.textContent).toContain('03:00');
    click('next');expect(actions.start).toHaveBeenCalledWith(0,'expedition');
  });
  it('preserves next-chapter behavior for a normal chapter',()=>{
    journey.start(0,'tour');journey.elapsed=60;journey.finish(true);ui.update(0,1800,0,50);
    click('next');expect(actions.start).toHaveBeenCalledWith(1,'tour');
  });
});

describe('returning player and storage feedback',()=>{
  it('shows saved chapter and Grand Tour records and restores an unlocked selected route',()=>{
    journey.save.medals=[3,2,0];journey.save.best=[55,72,0];journey.save.expeditionMedal=2;journey.save.expeditionBest=188;journey.save.selectedStage=1;saveProgress(journey.save);
    journey=new Journey();ui=new Experience(journey,actions);ui.update(0,0,0,100);
    expect(document.getElementById('collection-progress')!.textContent).toBe('2 / 3 CHAPTERS COMPLETE');
    expect(document.querySelector('[data-stage="0"]')!.textContent).toContain('GOLD / BEST 00:55');
    expect(document.getElementById('expedition-record')!.textContent).toContain('Silver / Best 03:08');
    expect(document.querySelector('[data-stage="1"]')!.getAttribute('aria-pressed')).toBe('true');
    click('start');click('begin-drive');expect(actions.start).toHaveBeenCalledWith(1,'tour');
  });
  it('keeps selected-route focus and persists selection after the cards refresh',()=>{
    journey.save.medals[0]=3;journey.phase='paused';ui.update(0,0,0,100);journey.phase='menu';ui.update(0,0,0,100);
    const card=document.querySelector<HTMLButtonElement>('[data-stage="1"]')!;card.focus();card.click();
    expect(document.activeElement?.getAttribute('data-stage')).toBe('1');
    expect(new Journey().save.selectedStage).toBe(1);
  });
  it('reports every failed setting write and clears the warning after a successful retry',()=>{
    const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked');});
    const warning=()=>expect(document.getElementById('save-status')!.classList.contains('hidden')).toBe(false);
    document.querySelector<HTMLButtonElement>('[data-color]')!.click();warning();click('radio');warning();click('settings');
    const volume=document.getElementById('volume') as HTMLInputElement;volume.value='.7';volume.dispatchEvent(new Event('input'));warning();expect(journey.save.volume).toBe(.7);
    const quality=document.getElementById('quality') as HTMLSelectElement;quality.value='high';quality.dispatchEvent(new Event('change'));warning();expect(actions.quality).toHaveBeenCalledWith('high');
    click('ghost-setting');warning();expect(journey.save.ghost).toBe(false);
    write.mockRestore();volume.dispatchEvent(new Event('input'));expect(document.getElementById('save-status')!.classList.contains('hidden')).toBe(true);
  });
});

describe('saved drive menus',()=>{
  it('offers checkpoint Continue and explains its recovery and ghost rules',()=>{
    journey.start(0,'expedition');journey.update(3,6,0);journey.update(40,5900/12,0);journey.pause();
    journey=new Journey();ui=new Experience(journey,actions);ui.update(0,0,0,100);
    expect(document.getElementById('continue-run')!.classList.contains('hidden')).toBe(false);click('continue-run');
    const text=document.getElementById('modal')!.textContent;expect(text).toContain('Checkpoint 1 / 12');expect(text).toContain('three seconds');expect(text).toContain('will not replace');
    expect(actions.continueRun).not.toHaveBeenCalled();click('resume-saved');expect(actions.continueRun).toHaveBeenCalledOnce();
  });
  it('protects a paused Grand Tour from accidental restart and can cancel without losing state',()=>{
    journey.start(0,'expedition');journey.update(3,6,0);journey.update(35,5900/12,0);journey.pause();ui.update(0,0,0,100);
    expect(document.getElementById('retry')!.textContent).toBe('Restart Grand Tour');click('retry');expect(actions.start).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('keep-drive');click('keep-drive');expect(journey.checkpoint).toBe(1);expect(journey.elapsed).toBe(35);expect(journey.phase).toBe('paused');
    click('retry');click('replace-drive');expect(actions.start).toHaveBeenCalledWith(0,'expedition');
  });
  it('asks before replacing a saved drive from the garage',()=>{
    journey.start(0,'expedition');journey=new Journey();ui=new Experience(journey,actions);ui.update(0,0,0,100);
    click('start');click('begin-drive');expect(actions.start).not.toHaveBeenCalled();click('keep-drive');expect(document.getElementById('begin-drive')).not.toBeNull();
    click('begin-drive');click('replace-drive');expect(actions.start).toHaveBeenCalledWith(0,'tour');
  });
  it('uses the latest chapter selection after next-chapter progression and a garage return',()=>{
    journey.start(0,'tour');journey.elapsed=60;journey.finish(true);journey.start(1,'tour');ui.update(0,0,0,100);journey.pause();journey.phase='menu';ui.update(0,0,0,100);
    expect(document.querySelector('[data-stage="1"]')!.getAttribute('aria-pressed')).toBe('true');expect(document.getElementById('start')!.textContent).toContain('CHAPTER 02');
  });
});

it('explains that restarting free drive retains a saved timed drive',()=>{
  journey.start(0,'expedition');const pending=journey.pendingRun;journey.start(0,'free');journey.pause();ui.update(0,0,0,100);click('retry');
  expect(document.getElementById('modal')!.textContent).toContain('Your saved timed drive stays available.');click('replace-drive');
  expect(actions.start).toHaveBeenCalledWith(0,'free');expect(journey.pendingRun).toBe(pending);
});


it('selects and restores every garage paint without changing saved progress',()=>{
  journey.save.medals=[3,0,0];journey.save.best=[54,0,0];
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-color]')){
    button.click();const color=Number(button.dataset.color);
    expect(actions.paint).toHaveBeenLastCalledWith(color);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const restored=readSave();expect(restored.color).toBe(color);
    expect(restored.medals).toEqual([3,0,0]);expect(restored.best[0]).toBe(54);
  }
  expect(document.querySelectorAll('[data-color]')).toHaveLength(10);
});
