/* tslint:disable:no-unused-variable */
/*
 * Copyright 2016 Next Century Corporation
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { ComponentFixture, async, TestBed } from '@angular/core/testing';
import { DebugElement }    from '@angular/core';
import { FormsModule }     from '@angular/forms';

import 'hammerjs';

import { AppComponent } from './app.component';
import { AboutNeonComponent } from './components/about-neon/about-neon.component';
import { DatasetSelectorComponent } from './components/dataset-selector/dataset-selector.component';
import { DashboardOptionsComponent } from './components/dashboard-options/dashboard-options.component';
import { VisualizationContainerComponent } from './components/visualization-container/visualization-container.component';
import { VisualizationInjectorComponent } from './components/visualization-injector/visualization-injector.component';
import { TextCloudComponent } from './components/text-cloud/text-cloud.component';

import { NeonGTDConfig } from './neon-gtd-config';

import { ActiveGridService } from './services/active-grid.service';
import { DatasetService } from './services/dataset.service';
import { ConnectionService } from './services/connection.service';
import { ErrorNotificationService } from './services/error-notification.service';
import { ExportService } from './services/export.service';
import { FilterService } from './services/filter.service';

import { ParameterService } from './services/parameter.service';
import { ThemesService } from './services/themes.service';
import { VisualizationService } from './services/visualization.service';

import { NgGridModule } from 'angular2-grid';

import { MaterialModule } from '@angular/material';

describe('App: NeonGtd', () => {
  let testConfig: NeonGTDConfig = new NeonGTDConfig();
  let fixture: ComponentFixture<AppComponent>;
  let de: DebugElement;
  let component: AppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        AboutNeonComponent,
        DashboardOptionsComponent,
        DatasetSelectorComponent,
        VisualizationContainerComponent,
        VisualizationInjectorComponent,
        TextCloudComponent
      ],
      imports: [
        FormsModule,
        MaterialModule,
        MaterialModule.forRoot(),
        NgGridModule
      ],
      providers: [
        { provide: 'config', useValue: testConfig },
        ActiveGridService,
        DatasetService,
        ConnectionService,
        ErrorNotificationService,
        ExportService,
        FilterService,
        ParameterService,
        ThemesService,
        VisualizationService
      ]
    });

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;
  });

  it('should create an instance', async(() => {
    expect(component).toBeTruthy();
  }));

  it('should include top level layout components', async(() => {
    expect(de.nativeElement.querySelectorAll('md-sidenav-layout')).toBeTruthy();
    expect(de.nativeElement.querySelectorAll('app-dataset-selector')).toBeTruthy();
    // Since the about pane and options pane are rendered only after a user opens their sidenav area,
    // these should not exist upon initial render.
    expect(de.nativeElement.querySelectorAll('app-about-neon').length === 0).toBeTruthy();
    expect(de.nativeElement.querySelectorAll('app-dashboard-options').length === 0).toBeTruthy();
  }));
});