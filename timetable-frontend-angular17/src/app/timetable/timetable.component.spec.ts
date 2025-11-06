import { TimetableComponent } from './timetable.component';

class MockLangService {
  getTranslations() { return {}; }
  getCurrentLanguage() { return 'fr'; }
  currentLanguage$ = { subscribe: (fn: any) => { fn('fr'); return { unsubscribe(){} }; } };
}

describe('TimetableComponent.isEntriesEmpty', () => {
  let comp: TimetableComponent;

  beforeEach(() => {
    const mock = new MockLangService();
    comp = new TimetableComponent({} as any, mock as any, mock as any);
  });

  it('returns true for null or undefined', () => {
    expect(comp.isEntriesEmpty(null)).toBeTrue();
    expect(comp.isEntriesEmpty(undefined)).toBeTrue();
  });

  it('returns true for empty array', () => {
    expect(comp.isEntriesEmpty([])).toBeTrue();
  });

  it('returns true when entries exist but all fields blank', () => {
    const entries = [
      { subject: '', teacher: '', room: '', subgroup: '' },
      { subject: '   ', teacher: null }
    ];
    expect(comp.isEntriesEmpty(entries)).toBeTrue();
  });

  it('returns false when at least one entry has a subject', () => {
    const entries = [{ subject: 'Math', teacher: '', room: '' }];
    expect(comp.isEntriesEmpty(entries)).toBeFalse();
  });

  it('returns false when at least one entry has subgroup/room/teacher', () => {
    expect(comp.isEntriesEmpty([{ subgroup: '3APIC-5:G1' }])).toBeFalse();
    expect(comp.isEntriesEmpty([{ room: 'S1' }])).toBeFalse();
    expect(comp.isEntriesEmpty([{ teacher: 'John Doe' }])).toBeFalse();
  });
});
