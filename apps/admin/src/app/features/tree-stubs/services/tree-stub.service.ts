import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TreeStubGroup, TreeStub, TreeStubGroupInputDto, TreeStubInputDto, TreeStubGroupResponseDto, TreeStubResponseDto } from '@ghanawaters/shared-models';

@Injectable({
  providedIn: 'root'
})
export class TreeStubService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Tree Stub Groups
  getGroups(): Observable<TreeStubGroupResponseDto[]> {
    return this.http.get<TreeStubGroupResponseDto[]>(`${this.apiUrl}/tree-stub-groups`);
  }

  getGroup(id: number): Observable<TreeStubGroupResponseDto> {
    return this.http.get<TreeStubGroupResponseDto>(`${this.apiUrl}/tree-stub-groups/${id}`);
  }

  createGroup(group: TreeStubGroupInputDto): Observable<TreeStubGroupResponseDto> {
    return this.http.post<TreeStubGroupResponseDto>(`${this.apiUrl}/tree-stub-groups`, group);
  }

  updateGroup(id: number, group: TreeStubGroupInputDto): Observable<TreeStubGroupResponseDto> {
    return this.http.patch<TreeStubGroupResponseDto>(`${this.apiUrl}/tree-stub-groups/${id}`, group);
  }

  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tree-stub-groups/${id}`);
  }

  // Tree Stubs
  getTreeStubs(groupId?: number): Observable<TreeStubResponseDto[]> {
    const url = groupId 
      ? `${this.apiUrl}/tree-stubs?group_id=${groupId}`
      : `${this.apiUrl}/tree-stubs`;
    return this.http.get<TreeStubResponseDto[]>(url);
  }

  getTreeStub(id: number): Observable<TreeStubResponseDto> {
    return this.http.get<TreeStubResponseDto>(`${this.apiUrl}/tree-stubs/${id}`);
  }

  createTreeStub(treeStub: TreeStubInputDto): Observable<TreeStubResponseDto> {
    return this.http.post<TreeStubResponseDto>(`${this.apiUrl}/tree-stubs`, treeStub);
  }

  deleteTreeStub(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tree-stubs/${id}`);
  }

  deleteTreeStubsByGroup(groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tree-stubs/group/${groupId}`);
  }
}