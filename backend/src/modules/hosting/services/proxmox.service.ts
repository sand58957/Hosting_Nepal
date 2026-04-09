import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as https from 'https';
import { PrismaService } from '../../../database/prisma.service';
import { IpStatus, IpAssignedType } from '@prisma/client';

interface ProxmoxTicket {
  ticket: string;
  CSRFPreventionToken: string;
  issuedAt: number;
}

@Injectable()
export class ProxmoxService {
  private readonly logger = new Logger(ProxmoxService.name);
  private readonly http: AxiosInstance;
  private readonly host: string;
  private readonly user: string;
  private readonly password: string;
  readonly node: string;
  private cachedTicket: ProxmoxTicket | null = null;
  private readonly TICKET_TTL_MS = 90 * 60 * 1000; // 1.5 hours

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.host =
      this.configService.get<string>('PROXMOX_HOST') || 'https://localhost:8006';
    this.user =
      this.configService.get<string>('PROXMOX_USER') || 'root@pam';
    this.password =
      this.configService.get<string>('PROXMOX_PASSWORD') || '';
    this.node =
      this.configService.get<string>('PROXMOX_NODE') || 'pve';

    this.http = axios.create({
      baseURL: this.host,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000,
    });
  }

  async getTicket(): Promise<ProxmoxTicket> {
    const now = Date.now();
    if (
      this.cachedTicket &&
      now - this.cachedTicket.issuedAt < this.TICKET_TTL_MS
    ) {
      return this.cachedTicket;
    }

    try {
      this.logger.log('Authenticating with Proxmox VE API');
      const response = await this.http.post<{
        data: { ticket: string; CSRFPreventionToken: string };
      }>('/api2/json/access/ticket', null, {
        params: {
          username: this.user,
          password: this.password,
        },
      });

      this.cachedTicket = {
        ticket: response.data.data.ticket,
        CSRFPreventionToken: response.data.data.CSRFPreventionToken,
        issuedAt: now,
      };

      this.logger.log('Proxmox authentication successful');
      return this.cachedTicket;
    } catch (error) {
      this.logger.error('Failed to authenticate with Proxmox', error as string);
      throw error;
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const ticket = await this.getTicket();
    return {
      Cookie: `PVEAuthCookie=${ticket.ticket}`,
      CSRFPreventionToken: ticket.CSRFPreventionToken,
    };
  }

  private handleError(method: string, error: unknown): never {
    if (error instanceof AxiosError) {
      this.logger.error(
        `Proxmox [${method}] HTTP ${error.response?.status}: ${JSON.stringify(error.response?.data)}`,
        error.stack,
      );
      throw new Error(
        `Proxmox ${method} failed: ${JSON.stringify(error.response?.data?.errors) || error.message}`,
      );
    }
    this.logger.error(`Proxmox [${method}] unexpected error`, error as string);
    throw error;
  }

  async getNodes(): Promise<Record<string, unknown>[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.http.get<{ data: Record<string, unknown>[] }>(
        '/api2/json/nodes',
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getNodes', error);
    }
  }

  async getNodeStatus(node: string): Promise<Record<string, unknown>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.http.get<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/status`,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getNodeStatus', error);
    }
  }

  async createVm(
    node: string,
    vmConfig: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Creating VM on node: ${node}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu`,
        vmConfig,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('createVm', error);
    }
  }

  async cloneTemplate(
    node: string,
    templateId: number,
    newVmId: number,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(
        `Cloning template ${templateId} to VM ${newVmId} on node: ${node}`,
      );
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${templateId}/clone`,
        { newid: newVmId, ...config },
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('cloneTemplate', error);
    }
  }

  async startVm(node: string, vmid: number): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Starting VM ${vmid} on node: ${node}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/start`,
        {},
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('startVm', error);
    }
  }

  async stopVm(node: string, vmid: number): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Stopping VM ${vmid} on node: ${node}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/stop`,
        {},
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('stopVm', error);
    }
  }

  async shutdownVm(node: string, vmid: number): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Shutting down VM ${vmid} on node: ${node}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/shutdown`,
        {},
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('shutdownVm', error);
    }
  }

  async restartVm(node: string, vmid: number): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Restarting VM ${vmid} on node: ${node}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/reboot`,
        {},
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('restartVm', error);
    }
  }

  async getVmStatus(node: string, vmid: number): Promise<Record<string, unknown>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.http.get<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/current`,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getVmStatus', error);
    }
  }

  async getVmConfig(node: string, vmid: number): Promise<Record<string, unknown>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.http.get<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/config`,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getVmConfig', error);
    }
  }

  async deleteVm(node: string, vmid: number): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Deleting VM ${vmid} on node: ${node}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.delete<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}`,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('deleteVm', error);
    }
  }

  async resizeDisk(
    node: string,
    vmid: number,
    disk: string,
    size: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Resizing disk ${disk} on VM ${vmid} to ${size}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.put<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/resize`,
        { disk, size },
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('resizeDisk', error);
    }
  }

  async getVmRrddata(
    node: string,
    vmid: number,
    timeframe: string = 'hour',
  ): Promise<Record<string, unknown>[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.http.get<{ data: Record<string, unknown>[] }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/rrddata`,
        { headers, params: { timeframe } },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getVmRrddata', error);
    }
  }

  async createSnapshot(
    node: string,
    vmid: number,
    snapname: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Creating snapshot ${snapname} for VM ${vmid}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/snapshot`,
        { snapname },
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('createSnapshot', error);
    }
  }

  async rollbackSnapshot(
    node: string,
    vmid: number,
    snapname: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Rolling back snapshot ${snapname} for VM ${vmid}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/snapshot/${snapname}/rollback`,
        {},
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('rollbackSnapshot', error);
    }
  }

  async listSnapshots(
    node: string,
    vmid: number,
  ): Promise<Record<string, unknown>[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.http.get<{ data: Record<string, unknown>[] }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/snapshot`,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('listSnapshots', error);
    }
  }

  async deleteSnapshot(
    node: string,
    vmid: number,
    snapname: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Deleting snapshot ${snapname} for VM ${vmid}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.delete<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/snapshot/${snapname}`,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('deleteSnapshot', error);
    }
  }

  async getVncProxy(
    node: string,
    vmid: number,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Requesting VNC proxy for VM ${vmid}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/vncproxy`,
        { websocket: 1 },
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getVncProxy', error);
    }
  }

  async setVmConfig(
    node: string,
    vmid: number,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Updating config for VM ${vmid}`);
      const headers = await this.getAuthHeaders();
      const response = await this.http.put<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/config`,
        config,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('setVmConfig', error);
    }
  }

  async execGuestAgent(
    node: string,
    vmid: number,
    command: string,
    inputData?: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Executing guest agent command on VM ${vmid}: ${command}`);
      const headers = await this.getAuthHeaders();
      const body: Record<string, unknown> = { command };
      if (inputData) {
        body['input-data'] = inputData;
      }
      const response = await this.http.post<{ data: Record<string, unknown> }>(
        `/api2/json/nodes/${node}/qemu/${vmid}/agent/exec`,
        body,
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('execGuestAgent', error);
    }
  }

  async allocateIp(vmid: number): Promise<string> {
    try {
      this.logger.log(`Allocating IP for VM ${vmid}`);
      const availableIp = await this.prisma.ipPool.findFirst({
        where: { status: IpStatus.AVAILABLE },
      });

      if (!availableIp) {
        throw new Error('No available IP addresses in pool');
      }

      await this.prisma.ipPool.update({
        where: { id: availableIp.id },
        data: {
          status: IpStatus.ALLOCATED,
          assignedTo: String(vmid),
          assignedType: IpAssignedType.VPS,
        },
      });

      this.logger.log(
        `Allocated IP ${availableIp.ipAddress} to VM ${vmid}`,
      );
      return availableIp.ipAddress;
    } catch (error) {
      this.logger.error(`Failed to allocate IP for VM ${vmid}`, error as string);
      throw error;
    }
  }

  async getNextVmId(): Promise<number> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.http.get<{ data: number }>(
        '/api2/json/cluster/nextid',
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getNextVmId', error);
    }
  }
}
