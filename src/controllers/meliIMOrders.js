import axios from 'axios';
//import { isTag } from 'cherio/lib/utils';
import  { GoogleSpreadsheet } from 'google-spreadsheet';
import informationTokensStatus from '../credentials/credenciales_definitivas.json' assert { type: "json" };
import * as token from "/Users/Franco/Desktop/credentials/MX.json" assert {type:'json'};            // /Users/Franco/Desktop/credentials/FC.json
import dotenv from "dotenv";
import { exportSheet, dateToday, llamadaAPI } from '../funciones/funcionesUtiles';

dotenv.config({path:"../../.env"});
let urlDet ='https://api.mercadolibre.com/orders/';                                                 // Url para llamar por reclamos inviduales
let url = 'https://api.mercadolibre.com/orders/search';                                             // Url que consulta la totalidad de los reclamos de la cuenta

let urlTodasPublicaciones = "https://api.mercadolibre.com/users/1206541284/items/search";
let headerTodasPublicaciones = {Authorization:"Bearer "+token.default.access_token};
let paramsTodasPublicaciones = {limit:50, offset:0, total: 117};

let headers = {'Authorization':'Bearer '+token.default.access_token};
let dfecha = new Date();
let fInicial = "2022" + "-" + "12" +"-" + "14"+'T00:00:00.000Z'
let fFinal = new Date(dfecha).getFullYear()+"-"+(new Date(dfecha).getMonth()+1)+"-"+new Date(dfecha).getDate()+`T${new Date(dfecha).getHours()}:${new Date(dfecha).getMinutes()}:00.000Z` //No toma todos porque falta los de hoy, añadir la hora y demás con el new Date

let params = {
    seller:token.default.user_id,
    limit:'50',
    sort:'date_desc',
    "order.date_created.from": fInicial,
    "order.date_created.to": fFinal,
    search_type: "scan",
    scroll_id: ""
};


console.log('***Conectando con MELI API***');
let orders=[]
const callMeli = async (urlTodasPublicaciones,headerTodasPublicaciones, paramsTodasPublicaciones,url,head,param) => {    // Se realiza primer llamado, para tomar primera muestra y datos de paginacion
    const response =await llamadaAPI("get",url,headerTodasPublicaciones,param)

    /* 
    FREE COMMITS
    let response = await axios({
        method:'get',
        url: url,     
        headers: headerTodasPublicaciones,
        params: param,
    }); */
    
    try{

            /* Horarios */
            dateToday();
            /* 
            FREE COMMITS
            let now         = new Date();
            let nowNumber   = now.getTime();
            let horas       = now.getHours();
            let minutos     = ("0" + now.getMinutes() ).slice(-2);                                      //Esto para que el formato de minuto sea "09" y no "9"
            let horaMinuto  = " " + horas + ":" + minutos;
            let dia         = ("0" + now.getDate()).slice(-2);                                          //Esto para que el formato de hora sea "09" y no "9"
            let anio        = now.getFullYear();
            let mes         = now.getMonth() + 1;
            let hora_hoy    = dia + "/" + mes + "/" + anio;
            let date        = hora_hoy + " " + horaMinuto; */

            const contenedorDeCadaPagina = [];
            const allItems = [];                                                                        //Array  contenedor del total de productos ()
            const arrayContenedorLinkMLA = [];                                                          //Contiene los links de cada producto
            const arrayObjetos = [];                                                                    //Array objetos
            const limitAllPublication = paramsTodasPublicaciones.limit;                                 //Contiene el límite de productos por página (50)
            const totalPublicaciones = paramsTodasPublicaciones.total;                                  //Contiene el total de productos por página (117)
            const page = Math.ceil(totalPublicaciones / limitAllPublication);                           //Se calcula el número de páginas que hay, dividiendo el total de productos, por su límite

            //Desestructuramos la info de la API para traer la info necesaria, y la guardamos en una variable
            
            let resultadosTodasLasOrdenesData = response.data.results;                                  //Almacenamos los resultados en una variable
            let resultadosTodasLasOrdenesLimit = response.data.paging.limit;                            //Almacenamos el límite para calcular cuantas páginas son
            let resultadosTodasLasOrdenesTotal = response.data.paging.total;                            //Almacenamos el total para calcular cuantas páginas son
            let totalPaginas = Math.ceil(resultadosTodasLasOrdenesTotal / resultadosTodasLasOrdenesLimit);  //Lo dividimos, y obtenemos el número de páginas en total (redondea para arriba)

            for (let indexPaginacion = 0; indexPaginacion < totalPaginas; indexPaginacion++) {
                const responseInBucle =await llamadaAPI("get",url,headerTodasPublicaciones,param)

                /* 
                COOMMITS
                let responseInBucle = await axios({
                    method:'get',
                    url: url,     
                    headers: headerTodasPublicaciones,
                    params: param,
                }); */
                
                let responseData = responseInBucle.data.results;
                let scroll_id = responseInBucle.data.paging.scroll_id
                params.scroll_id = scroll_id;
                contenedorDeCadaPagina.push(...responseData)
            }
            //const contenedorDeCadaPaginaReverse = contenedorDeCadaPagina.reverse();                     //Revierte el orden del array, ahora trae de la fecha más reciente, a la más antigua
           
            for(let r in contenedorDeCadaPagina){
            orders.push({
                    order_id:contenedorDeCadaPagina[r].payments[0].order_id,
                })
            }
            let result_size = 10;
            let result_page = resultadosTodasLasOrdenesLimit; 
            let pages = Math.ceil(result_size/result_page);                                             // Calculo matematico para obtener cantidad de paginas
            //console.log(pages)
            for(var i=1;i < pages; i++){                                                                //Comienza a ciclar a partir de la segunda pagina
                let resultPage =i*result_page;
                params.offset = resultPage
                const pageResponse =await llamadaAPI("get",url,head,param)
                /* 
                FREE COMMITS
                let pageResponse = await axios ({
                    method:'get',
                    url:url,
                    headers:head,
                    params:param
                }); */
                let{
                    data:{resultadosTodasLasOrdenesData},
                }= pageResponse;

                
                for(r in resultadosTodasLasOrdenesData){
                    orders.push({
                        order_id: resultadosTodasLasOrdenesData[r].payments[0].order_id, 
                    });   
                };
            };

            console.log('***Obteniendo informacion de las Ventas***');
            const ordersOutput = [];
            for (let i = 0; i < orders.length; i++) {                                                  // Comienzo de segundo ciclo, para obtener el detalle de cada reclamo.-
                const ordersDet =await llamadaAPI("get",urlDet+orders[i].order_id,head)
                /* 
                FREE COMMITS
                let ordersDet = await axios ({
                    method:'get',
                    url : urlDet+orders[i].order_id,
                    headers : head,
                });  */  
                let response = ordersDet.data;
                console.log(response.status);
                let getDateCreatedProduct = new Date(response.date_created).toISOString().split('T')[0];//Filtrando el dato de fecha solo Año, Mes y día
                let idItems = response.id;
                let status = response.status;
                let idItemsToString = idItems.toString();

                //Calculo diferencia horaria
                let horarioColombia = new Date(response.date_created)                                            //Filtrando el dato de fecha solo Año, Mes y día
                let apiDate = new Date(horarioColombia)
                let apiDateMLSeconds = apiDate.getTime();
                let restMLSeconds = 60 * 300000 //5 horas, 300.000 mls
                let dateCOL = new Date(apiDateMLSeconds - restMLSeconds);
                let dateCOLComplete = new Date(apiDateMLSeconds - restMLSeconds);
                let anio = dateCOL.getFullYear();
                let mes = dateCOL.getMonth() + 1;
                let dia = ("0" + dateCOL.getDate() ).slice(-2)
                let hora =   ""
                let minutos = ("0" + dateCOL.getMinutes() ).slice(-2)
                let segundos = ("0" + dateCOL.getSeconds() ).slice(-2)
                let daysFormat = dia + "/" + mes + "/" + anio;
                let hoursFormat = + hora + ":" + minutos + ":" + segundos;
                
                let dateCOL_Format = hoursFormat + " " + daysFormat;

                ordersOutput.push({                                                                     //Pusheamos toda la info al array de ordersOutput
                    ID :                        idItemsToString,
                    "Status Order" :            status,
                    Item_ID:                    response.order_items[0].item.id,
                    Seller_SKU:                 response.order_items[0].item.seller_sku,
                    Quantity:                   response.order_items[0].quantity,
                    Date_created:               daysFormat,
                    Total_amount:               response.total_amount,
                    Domain_id:                  "",
                    Timestamp:                  dateToday().date
                    //mediations: response.mediations[0]?.id
                    //shipping_type: response.order_items[0].listing_type_id,
                });
            };
            
            /* Extracción de datos Domain_id */
            
            for (let i = 0; i < ordersOutput.length; i++) {                                             //Itera el array de Objetos (todos los productos)
                const ordersDet =await llamadaAPI("get",process.env.URL_ITEM_DETAIL + ordersOutput[i].Item_IDhead)

                /* 
                FREE COMMITS
                let callingItems = await axios({
                    method: "get",
                    url: process.env.URL_ITEM_DETAIL + ordersOutput[i].Item_ID
                }); */
                let responseCall = callingItems.data.domain_id;
                console.log(callingItems.data.domain_id);
                ordersOutput[i].Domain_id = responseCall;
            };
            console.log(ordersOutput);
            
            
            console.log('***iniciando exportacion a Google Sheets***');
            
            const googleId=process.env.GOOGLE_ID_MELI_MORDERS_MEX;

            const credencialesStatus = informationTokensStatus;
            const googleIdCredenciales = process.env.ID_STATUS;

            console.log(process.env.ID_STATUS);
            const arrayStatusMeliIMStock = [{
                Fecha_meliIMOrders:      dateToday().hora_hoy,
                Hora_meliIMOrders:       dateToday().horaMinuto,
                Status_meliIMOrders:     response.status,
                Message_meliIMOrders:    response.statusText,
            }];
                console.log(arrayStatusMeliIMStock);
                console.log('***Iniciando proceso de impotacion***');
                exportSheet(googleId,credencialesStatus,'Orders',ordersOutput);
                exportSheet(googleIdCredenciales,credencialesStatus,'COL Tools',arrayStatusMeliIMStock);
                console.log('***Proceso finalizado correctamente***');
            /* 
            FREE COMMITS
            async function accederGS () {
        
                const documento = new GoogleSpreadsheet(googleId);
                await documento.useServiceAccountAuth(credencialesStatus);
                await documento.loadInfo();
            
                //const sheet =documento.sheetsByTitle['Data_Set_Ventas'];
                const sheet =documento.sheetsByTitle['Orders'];
                await sheet.clearRows();
                //await sheet.addRows(ordersOutput)                                                     //importa array de objetos en gsheets
                await sheet.addRows(ordersOutput);                                                      //importa array de objetos en gsheets
                    console.log('***finalizando impotacion***');
                    console.log('***Proceso finalizado correctamente***');
            }       
            async function expartasheetStatus(){
                const documentoStatus = new GoogleSpreadsheet(googleIdCredenciales);
                await documentoStatus.useServiceAccountAuth(credencialesStatus);
                await documentoStatus.loadInfo();

                const sheetStatus = documentoStatus.sheetsByTitle["COL Tools"];

                await sheetStatus.addRows(arrayStatusMeliIMStock);
            }
            expartasheetStatus();
            accederGS();    */
        }
        catch(error){
            console.log(error);
        }
}
callMeli(urlTodasPublicaciones,headerTodasPublicaciones, paramsTodasPublicaciones, url,headers,params);