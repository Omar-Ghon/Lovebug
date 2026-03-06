import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HowToOrderPageComponent } from './how-to-order.component';

describe('HowToOrderPageComponent', () => {
  let component: HowToOrderPageComponent;
  let fixture: ComponentFixture<HowToOrderPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HowToOrderPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HowToOrderPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});