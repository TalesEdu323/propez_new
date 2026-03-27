/**
 * CRM Integration Service - ProSync
 * 
 * This file contains the hooks and functions needed to integrate PropEZ with your external CRM (ProSync).
 * Replace the contents of these functions with actual `fetch` or `axios` calls to your ProSync API.
 */

export interface ExternalClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  document?: string; // CPF/CNPJ
  company?: string;
  source?: 'prosync' | 'local';
}

export interface ProposalStatusUpdate {
  proposalId: string;
  crmClientId: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  value: number;
  updatedAt: string;
  proposalUrl?: string;
  clientEmail?: string;
  clientDocument?: string;
  products?: string[];
}

/**
 * Fetch leads/clients from ProSync CRM.
 * 
 * @returns A promise that resolves to an array of clients from ProSync.
 */
export async function fetchClientsFromCRM(): Promise<ExternalClient[]> {
  console.log('[ProSync Integration] Fetching leads from ProSync API...');
  
  try {
    // Exemplo de implementação real:
    // const response = await fetch(`${import.meta.env.VITE_PROSYNC_API_URL}/v1/leads`, {
    //   headers: { 'Authorization': `Bearer ${import.meta.env.VITE_PROSYNC_API_KEY}` }
    // });
    // const data = await response.json();
    // return data.leads.map((lead: any) => ({
    //   id: lead.id,
    //   name: lead.name,
    //   email: lead.email,
    //   phone: lead.phone,
    //   company: lead.company_name,
    //   source: 'prosync'
    // }));

    // Mock response para demonstração
    return [
      { id: 'prosync-001', name: 'Lead do ProSync 1', email: 'lead1@prosync.com', phone: '11999999999', source: 'prosync' },
      { id: 'prosync-002', name: 'Lead do ProSync 2', email: 'lead2@prosync.com', phone: '11888888888', source: 'prosync' }
    ];
  } catch (error) {
    console.error('[ProSync Integration] Error fetching leads:', error);
    return [];
  }
}

/**
 * Send proposal data and status to ProSync CRM.
 * 
 * @param update The status update payload containing proposal details.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function updateProposalStatusInCRM(update: ProposalStatusUpdate): Promise<boolean> {
  console.log(`[ProSync Integration] Sending proposal ${update.proposalId} to ProSync...`, update);
  
  try {
    // Exemplo de implementação real:
    // const response = await fetch(`${import.meta.env.VITE_PROSYNC_API_URL}/v1/proposals`, {
    //   method: 'POST',
    //   headers: { 
    //     'Authorization': `Bearer ${import.meta.env.VITE_PROSYNC_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(update)
    // });
    // return response.ok;

    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('[ProSync Integration] Successfully synced with ProSync!');
    return true;
  } catch (error) {
    console.error('[ProSync Integration] Error syncing with ProSync:', error);
    return false;
  }
}

/**
 * Sync a product/service with ProSync CRM.
 * 
 * @param product The product details.
 * @returns A promise that resolves to true if successful.
 */
export async function syncProductWithCRM(product: { id: string; nome: string; valor: number }): Promise<boolean> {
  console.log(`[ProSync Integration] Syncing product ${product.nome} (${product.id}) with ProSync...`);
  
  try {
    // Exemplo de implementação real:
    // const response = await fetch(`${import.meta.env.VITE_PROSYNC_API_URL}/v1/products`, {
    //   method: 'POST',
    //   headers: { 
    //     'Authorization': `Bearer ${import.meta.env.VITE_PROSYNC_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(product)
    // });
    // return response.ok;

    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[ProSync Integration] Product ${product.nome} synced!`);
    return true;
  } catch (error) {
    console.error('[ProSync Integration] Error syncing product:', error);
    return false;
  }
}
