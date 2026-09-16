import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { WorkPage } from './work.page';
import { ArtworkCardComponent } from '../../shared/components/artwork-card/artwork-card.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { ImageViewerComponent } from '../../shared/components/image-viewer/image-viewer.component';
import { SeoService } from '../../core/services/seo.service';
import { ARTWORKS } from '../../domain/const/artworks.const';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

describe('WorkPage', () => {
  let fixture: ComponentFixture<WorkPage>;
  let component: WorkPage;
  let root: HTMLElement;
  let setWorkMeta: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  function queryAll(selector: string): HTMLElement[] {
    const nodes: NodeListOf<HTMLElement> = root.querySelectorAll(selector);
    return Array.from(nodes);
  }

  const tabLabels = (): string[] =>
    queryAll('.filter-tab').map((t) => t.textContent?.replace(/\s+/g, ' ').trim() ?? '');

  /**
   * Drives filters through real clicks. This app is zoneless + OnPush, so a
   * direct `component.setFilter()` call leaves the view unmarked and
   * detectChanges() will not re-render it.
   */
  function clickTab(label: string): void {
    const tab = queryAll('.filter-tab').find((t) => t.textContent?.includes(label));
    if (!tab) throw new Error(`no filter tab matching "${label}"`);
    tab.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    setWorkMeta = vi.fn();

    await TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([]), NoopAnimationsModule, TranslatePipe],
      declarations: [WorkPage, ArtworkCardComponent, FooterComponent, ImageViewerComponent],
      providers: [{ provide: SeoService, useValue: { setWorkMeta } }],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(WorkPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialisation', () => {
    it('sets the work page SEO meta', () => {
      expect(setWorkMeta).toHaveBeenCalledTimes(1);
    });

    it('starts on the all filter showing every artwork', () => {
      expect(component.activeFilter).toBe('all');
      expect(component.filteredArtworks).toEqual(ARTWORKS);
      expect(queryAll('app-artwork-card').length).toBe(ARTWORKS.length);
    });

    it('renders the page header', () => {
      expect(root.querySelector('.work-title')?.textContent?.trim()).toBe('All Work');
      expect(root.querySelector('.work-label')?.textContent?.trim()).toBe('Portfolio');
      expect(root.querySelector('.work-subtitle')).toBeTruthy();
    });

    it('renders the footer exactly once', () => {
      expect(queryAll('app-footer').length).toBe(1);
    });
  });

  describe('filter tabs', () => {
    it('counts each category and drops the ones with no work', () => {
      // ARTWORKS has no 'ui' entries, so that tab is removed entirely.
      expect(tabLabels()).toEqual(['All 33', 'Illustration 27', 'Branding 2', 'Print 4']);
    });

    it('keeps the All tab even when it is the only match', () => {
      const all = component.filterTabs.find((t) => t.value === 'all');

      expect(all).toBeTruthy();
      expect(all!.count).toBe(ARTWORKS.length);
    });

    it('marks only the active tab as selected', () => {
      const tabs = queryAll('.filter-tab');

      expect(tabs[0].classList.contains('active')).toBe(true);
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].classList.contains('active')).toBe(false);
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    });

    it('filters the grid when a tab is clicked', () => {
      clickTab('Branding');

      expect(component.activeFilter).toBe('branding');
      expect(queryAll('app-artwork-card').length).toBe(2);
      expect(root.querySelector('.card__title')?.textContent?.trim()).toBe(
        'BackToDeck Logo Design',
      );
    });

    it('returns to every artwork when All is selected again', () => {
      clickTab('Print');
      expect(queryAll('app-artwork-card').length).toBe(4);

      clickTab('All');

      expect(queryAll('app-artwork-card').length).toBe(ARTWORKS.length);
    });

    it('ignores a repeat selection of the active filter', () => {
      const state = component.animationState;

      component.setFilter('all');

      expect(component.animationState).toBe(state);
    });

    it('bumps the animation key on each real filter change', () => {
      component.setFilter('illustration');
      expect(component.animationState).toBe(1);

      component.setFilter('all');
      expect(component.animationState).toBe(2);
    });

    it('filters to a single category', () => {
      component.setFilter('illustration');

      expect(component.filteredArtworks.map((a) => a.id)).toEqual([
        '13',
        '8',
        '17',
        '1',
        '2',
        '3',
        '16',
        '7',
        '9',
        '11',
        '12',
        '14',
        '15',
        '19',
        '23',
        '5',
        '10',
        '24',
        '25',
        '26',
        '27',
        '28',
        '29',
        '30',
        '31',
        '32',
        '35',
      ]);
    });
  });

  describe('result count and empty state', () => {
    it('pluralises the count', () => {
      const count = (): string | undefined =>
        root.querySelector('.work-count span')?.textContent?.trim();
      const branding = ARTWORKS.filter((a) => a.category === 'branding').length;

      expect(count()).toBe(`${ARTWORKS.length} works`);

      clickTab('Branding');

      expect(count()).toBe(`${branding} works`);
    });

    it('shows the empty state and hides the grid when nothing matches', async () => {
      component.filteredArtworks = [];
      // Click the already-active tab: setFilter() early-returns so the empty
      // list survives, but the click still triggers the render.
      clickTab('All');
      // .work-grid carries an animation trigger, so its *ngIf removal is
      // deferred until the animation engine settles.
      await fixture.whenStable();
      fixture.detectChanges();

      expect(root.querySelector('.work-empty')).toBeTruthy();
      expect(root.querySelector('.work-grid')).toBeNull();
      expect(queryAll('app-artwork-card').length).toBe(0);
    });
  });

  describe('lightbox', () => {
    it('opens at the index of the clicked artwork within the filtered list', () => {
      const target = component.filteredArtworks[2];

      component.openViewer(target);
      fixture.detectChanges();

      expect(component.viewerIndex).toBe(2);
      expect(component.viewerVisible).toBe(true);
    });

    it('indexes against the filtered list, not the full list', () => {
      component.setFilter('print');
      fixture.detectChanges();

      // '21' is index 2 of the print-filtered list but index 11 of ARTWORKS.
      const businessCard = ARTWORKS.find((a) => a.id === '21')!;
      component.openViewer(businessCard);

      expect(component.viewerIndex).toBe(2);
    });

    it('hides the viewer and restores the page meta on close', () => {
      component.openViewer(component.filteredArtworks[0]);
      setWorkMeta.mockClear();

      component.closeViewer();
      fixture.detectChanges();

      expect(component.viewerVisible).toBe(false);
      expect(setWorkMeta).toHaveBeenCalledTimes(1);
    });

    it('passes the filtered list to the viewer', () => {
      component.setFilter('branding');
      fixture.detectChanges();

      const viewer = root.querySelector('app-image-viewer');
      expect(viewer).toBeTruthy();
      expect(component.filteredArtworks.length).toBe(
        ARTWORKS.filter((a) => a.category === 'branding').length,
      );
    });
  });

  describe('navigation', () => {
    it('routes home from goHome()', () => {
      component.goHome();

      expect(navigateSpy).toHaveBeenCalledWith(['/']);
    });

    it('routes home when the back button is clicked', () => {
      root.querySelector<HTMLButtonElement>('.back-btn')!.click();
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(['/']);
    });
  });

  describe('trackBy', () => {
    it('keys rows by artwork id', () => {
      expect(component.trackByArtwork(0, ARTWORKS[0])).toBe(ARTWORKS[0].id);
      expect(component.trackByArtwork(5, ARTWORKS[4])).toBe(ARTWORKS[4].id);
    });
  });
});
