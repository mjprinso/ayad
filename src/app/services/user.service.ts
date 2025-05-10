import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { from, Observable } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { NetworkStatusService } from './network-status.service';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly API = 'https://jsonplaceholder.typicode.com/users';

    constructor(
        private readonly http: HttpClient,
        private readonly db: NgxIndexedDBService,
        private readonly networkStatus: NetworkStatusService
    ) { }

    fetchAndStoreAllUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.API).pipe(
            switchMap(users =>
                from(this.db.bulkPut('users', users)).pipe(map(() => users))
            )
        );
    }


    getUserById(userId: number): Observable<User> {
        if (!this.networkStatus.isOnline) {
            return this.getUserByIdOffline(userId);
        }

        return this.http.get<User>(`${this.API}/${userId}`).pipe(
            switchMap(user =>
                from(this.db.update('users', user)).pipe(map(() => user))
            ),
            catchError(() => this.getUserByIdOffline(userId))
        );
    }

    private getUserByIdOffline(userId: number): Observable<User> {
        return from(this.db.getByKey('users', userId)) as Observable<User>;
    }
}
