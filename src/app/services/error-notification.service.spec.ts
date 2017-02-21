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
import { TestBed, inject } from '@angular/core/testing';
import { ErrorNotificationService } from './error-notification.service';

describe('Service: Export', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorNotificationService]
    });
  });

  it('should ...', inject([ErrorNotificationService], (service: ErrorNotificationService) => {
    expect(service).toBeTruthy();
  }));
});